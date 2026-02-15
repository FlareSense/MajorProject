import cv2
import time
import json
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, Response, jsonify, request, send_from_directory
from flask_cors import CORS
from ultralytics import YOLO
import threading
import os
import numpy as np
from werkzeug.utils import secure_filename

# Import Alert Logic
from alert import play_alarm, send_email_alert, make_call_alert
from utils import save_fire_image, calculate_chaos, CHAOS_THRESHOLD, MIN_MOTION_PIXELS
from fpdf import FPDF
from database import init_db, log_detection, get_all_fire_events, get_analytics_stats, get_fire_event_by_id

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Configure Uploads
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Load the new trained model
model = YOLO("best_v2.pt")

# Global variables
current_location = None # {lat: ..., lon: ...}
last_alarm_time = 0
ALARM_COOLDOWN = 60

# --- MULTI-CAMERA COMPONENT ---
class CameraManager:
    def __init__(self):
        # Configuration: ID -> Source
        # Source can be int (Webcam) or Str (IP URL or File Path) or None
        self.camera_sources = {
            0: 0,                   # Default Webcam
            1: None                 # Placeholder for dynamic video
        }
        self.cameras = {}   # Holds cv2.VideoCapture objects
        self.locks = {}     # Locks for thread safety per camera
        
        # Status per camera
        self.fire_status = {}
        for cam_id in self.camera_sources:
            self.fire_status[cam_id] = {
                "detected": False,
                "confidence": 0.0,
                "timestamp": None,
                "location": f"Camera {cam_id}",
                "severity": "None",
                "count": 0,
                "message": "System Normal",
                "active": True
            }
            self.locks[cam_id] = threading.Lock()
            # Only init if source is ready
            if self.camera_sources[cam_id] is not None:
                self.init_camera(cam_id, self.camera_sources[cam_id])

    def init_camera(self, cam_id, source):
        print(f"🔧 Initializing Camera {cam_id} (Source: {source})")
        cap = cv2.VideoCapture(source)
        if isinstance(source, int):
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        if cap.isOpened():
             self.cameras[cam_id] = cap
        else:
             print(f"❌ Error: Could not open source {source}")

    def get_camera(self, cam_id):
        if cam_id not in self.camera_sources:
            return None
        
        # Lazy initialization or Re-initialization
        with self.locks.get(cam_id, threading.Lock()):
            # If camera object missing but source exists
            if cam_id not in self.cameras and self.camera_sources[cam_id] is not None:
                 self.init_camera(cam_id, self.camera_sources[cam_id])
            
            # If camera closed (disconnected)
            if cam_id in self.cameras and not self.cameras[cam_id].isOpened():
                 if self.camera_sources[cam_id] is not None:
                     self.init_camera(cam_id, self.camera_sources[cam_id])
            
            return self.cameras.get(cam_id)
    
    def update_source(self, cam_id, new_source):
        print(f"🔄 Updating Camera {cam_id} Source -> {new_source}")
        self.release_camera(cam_id)
        self.camera_sources[cam_id] = new_source
        # Re-init will happen on next get_camera call
        
        if cam_id in self.fire_status:
             self.fire_status[cam_id]["message"] = "Source Updated"
             self.fire_status[cam_id]["detected"] = False

    def release_camera(self, cam_id):
        if cam_id in self.cameras:
            self.cameras[cam_id].release()
            del self.cameras[cam_id]

    def get_all_statuses(self):
        return self.fire_status

    def toggle_camera(self, cam_id, active):
        if cam_id in self.fire_status:
            self.fire_status[cam_id]['active'] = active
            if not active:
                self.release_camera(cam_id)
            return True
        return False

# Initialize Global Manager
camera_manager = CameraManager()


def generate_frames(cam_id):
    global last_alarm_time, current_location
    
    # Initialize prev_gray locally for this camera thread
    prev_gray = None 
    
    while True:
        status = camera_manager.fire_status.get(cam_id)
        source = camera_manager.camera_sources.get(cam_id)
        
        # If disabled OR no source assigned yet
        if not status or not status['active'] or source is None:
            # Return placeholder
            blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
            msg = "CAM OFF" if source is not None else "NO VIDEO SOURCE"
            cv2.putText(blank_frame, f"CAM {cam_id}: {msg}", (50, 240), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (100, 100, 100), 2)
            
            # If waiting for upload, show instruction
            if source is None and status['active']:
                 cv2.putText(blank_frame, "Please Upload Video", (180, 290), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)

            ret, buffer = cv2.imencode('.jpg', blank_frame)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.5)
            continue

        cap = camera_manager.get_camera(cam_id)
        if not cap or not cap.isOpened():
             # print(f"⚠️ Camera {cam_id} disconnected or initializing...")
             time.sleep(1)
             continue

        success, frame = cap.read()
        if not success:
            # If video file ends, loop it
            if isinstance(source, str):
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            else:
                break
        
        # Resize for consistent processing
        frame = cv2.resize(frame, (640, 480))

        # --- DETECTION LOGIC (Per Camera) ---
        # Run detection
        results = model(frame, verbose=False, conf=0.30)
        
        # Convert to grayscale for optical flow
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        detected_in_frame = False
        detections_list = []
        max_conf = 0.0
        max_severity = "None"
        max_chaos = 0.0
        
        # Overlay for transparent drawing
        overlay = frame.copy()
        
        # 1. YOLO Detection
        for result in results:
            for box in result.boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                label = model.names[cls]
                
                if label.lower() == "fire" and conf > 0.30:
                    detected_in_frame = True
                    max_conf = max(max_conf, conf)
                    
                    # Calculate Area
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    box_area = (x2 - x1) * (y2 - y1)
                    frame_area = frame.shape[0] * frame.shape[1]
                    coverage_pct = (box_area / frame_area) * 100
                    
                    # Determine Severity
                    severity = "Low"
                    color = (0, 255, 0) # Green for small
                    
                    if coverage_pct > 15.0:
                        severity = "High"
                        if max_severity != "High": max_severity = "High"
                        color = (0, 0, 255) # Red for danger
                    elif coverage_pct > 2.0:
                        severity = "Medium"
                        if max_severity == "None" or max_severity == "Low": max_severity = "Medium"
                        color = (0, 165, 255) # Orange
                    elif max_severity == "None":
                         max_severity = "Low"

                    if prev_gray is not None:
                         # Perform Liveness/Chaos Check
                         h, w = gray.shape
                         cx1, cy1 = max(0, x1), max(0, y1)
                         cx2, cy2 = min(w, x2), min(h, y2)
                         
                         chaos, motion_mag = calculate_chaos(gray, prev_gray, cx1, cy1, cx2, cy2)
                         
                         # Filter out static images or shaking photos
                         if motion_mag < 0.3:
                             severity = "Static (Fake)"
                             color = (255, 0, 0) # Blue
                             detected_in_frame = False 
                             conf = 0.0 
                         elif chaos < CHAOS_THRESHOLD:
                             severity = "Shaking (Fake)"
                             color = (255, 165, 0) # Orange
                             detected_in_frame = False
                             conf = 0.0
                         else:
                             detected_in_frame = True
                             max_chaos = chaos

                    detections_list.append({"severity": severity, "conf": conf})

                    # Drawing
                    cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1) 
                    label_text = f"{severity.upper()} {conf:.2f}"
                    t_size = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]

        # 2. SIMULATION FALLBACK (If no AI detection)
        # If this is the simulated camera (ID 1) and no YOLO fire found, check for the red circle
        if not detected_in_frame and cam_id == 1:
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            # Red color range
            lower_red1 = np.array([0, 70, 50])
            upper_red1 = np.array([10, 255, 255])
            lower_red2 = np.array([170, 70, 50])
            upper_red2 = np.array([180, 255, 255])
            
            mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
            mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
            mask = mask1 | mask2
            
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area > 500: # Threshold for the "red dot"
                    detected_in_frame = True
                    max_severity = "High" # Simulated is always high alert
                    max_conf = 0.99
                    x, y, w, h = cv2.boundingRect(cnt)
                    
                    # Draw visual indicator
                    cv2.rectangle(overlay, (x, y), (x+w, y+h), (0, 0, 255), -1)
                    sim_label = "SIMULATED FIRE"
                    t_size = cv2.getTextSize(sim_label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
                    cv2.rectangle(overlay, (x, y - t_size[1] - 10), (x + t_size[0] + 10, y), (0, 0, 255), -1)
                    cv2.putText(overlay, sim_label, (x + 5, y - 5), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                    cv2.rectangle(overlay, (x, y), (x+w, y+h), (0, 0, 255), 2)

        # Apply transparency
        if detected_in_frame:
            alpha = 0.35
            frame = cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0)

        # Update global status for this camera
        with camera_manager.locks[cam_id]:
            if detected_in_frame:
                status["detected"] = True
                status["confidence"] = float(max_conf)
                status["timestamp"] = time.time()
                status["severity"] = max_severity
                status["count"] = len(detections_list)
                
                if max_severity == "High":
                    status["message"] = f"CRITICAL: {len(detections_list)} FIRE(S) ON CAM {cam_id}!"
                else:
                    status["message"] = f"Warning: Fire Visible on Cam {cam_id}"

                # Alert Logic (Trigger only if REAL Fire)
                current_time = time.time()
                if current_time - last_alarm_time > ALARM_COOLDOWN:
                    print(f"🔥 CAM {cam_id} Triggered Alert! Severity: {max_severity}")
                    
                    loc_url = "GPS Unavailable"
                    if current_location:
                        loc_url = f"https://maps.google.com/?q={current_location['lat']},{current_location['lon']}"

                    threading.Thread(target=play_alarm, daemon=True).start()
                    img_path = save_fire_image(frame)
                    
                    threading.Thread(target=send_email_alert, args=(img_path, current_location), daemon=True).start()
                    threading.Thread(target=make_call_alert, args=(max_severity, loc_url), daemon=True).start()
                    
                    # Log to DB
                    db_severity = "HIGH"
                    if max_severity.lower() == "medium": db_severity = "MEDIUM"
                    if max_severity.lower() == "low": db_severity = "LOW"
                    
                    threading.Thread(target=log_detection, args=(
                        max_conf, max_chaos, db_severity, f"Camera {cam_id}", img_path, True, 
                        current_location['lat'] if current_location else None, 
                        current_location['lon'] if current_location else None, 
                        loc_url
                    ), daemon=True).start()

                    last_alarm_time = current_time
            else:
                # Reset if no fire for 3 seconds
                if status["timestamp"] and (time.time() - status["timestamp"] > 3):
                    status["detected"] = False
                    status["confidence"] = 0.0
                    status["severity"] = "None"
                    status["count"] = 0
                    status["message"] = "System Normal"

        # Encode frame
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        
        prev_gray = gray.copy()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')


@app.route('/api/camera/config', methods=['POST'])
def configure_camera():
    print(f"📥 Received camera config request: {request.form}")
    if 'file' not in request.files:
        print("❌ No file part in request")
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    cam_id = int(request.form.get('id', 1))
    
    if file.filename == '':
        print("❌ No selected file")
        return jsonify({"error": "No selected file"}), 400
        
    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        print(f"💾 Saving file to: {filepath}")
        file.save(filepath)
        
        # Update Camera Manager
        print(f"🔄 Updating Camera {cam_id} source to {filepath}")
        camera_manager.update_source(cam_id, filepath)
        
        return jsonify({"status": "success", "message": f"Camera {cam_id} source updated to {filename}"})

@app.route('/video_feed/<int:cam_id>')
def video_feed(cam_id):
    if cam_id not in camera_manager.camera_sources:
        return "Camera Not Found", 404
    return Response(generate_frames(cam_id), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/status')
def get_status():
    return jsonify(camera_manager.get_all_statuses())

@app.route('/api/location', methods=['POST'])
def update_location():
    global current_location
    data = request.json
    if data and 'lat' in data and 'lon' in data:
        current_location = data
        # print(f"📍 Location Updated: {current_location['lat']}, {current_location['lon']}")
        return jsonify({"status": "updated", "location": current_location})
    return jsonify({"status": "error"}), 400

@app.route('/api/camera/toggle', methods=['POST'])
def toggle_camera_route():
    data = request.json
    cam_id = data.get('id', 0)
    active = data.get('active', True)
    
    if camera_manager.toggle_camera(cam_id, active):
        status_msg = "ON" if active else "OFF"
        print(f"📷 Camera {cam_id} toggled {status_msg}")
        return jsonify({"status": "success", "camera_id": cam_id, "active": active})
    return jsonify({"status": "error", "message": "Camera not found"}), 400

@app.route('/api/debug/db')
def debug_db():
    from database import get_db_connection
    try:
        conn = get_db_connection()
        if conn and conn.is_connected():
            return jsonify({"status": "connected", "db_name": conn.database, "user": conn.user})
        return jsonify({"status": "failed", "reason": "Connection returned None"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/analytics/stats', methods=['GET'])
def get_analytics_data():
    try:
        stats = get_analytics_stats()
        events = get_all_fire_events()
        return jsonify({"stats": stats, "events": events})
    except Exception as e:
        print(f"Error in analytics stats: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/evidence/<path:filename>')
def serve_evidence(filename):
    return send_from_directory('evidence', filename)

@app.route('/api/event/<int:event_id>', methods=['GET'])
def get_event_details(event_id):
    try:
        event = get_fire_event_by_id(event_id)
        if event:
            return jsonify(event)
        return jsonify({"error": "Event not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
class PDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 12)
        # self.cell(0, 10, 'Fire Sense - Analytics Report', 0, 1, 'C')
        # self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

@app.route('/api/analytics/export', methods=['GET'])
def export_analytics_pdf():
    try:
        events = get_all_fire_events()
        stats = get_analytics_stats()
        
        pdf = PDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        
        pdf.set_font("Arial", 'B', 16)
        pdf.cell(200, 10, txt="FlareSense Analytics Report", ln=True, align='C')
        pdf.ln(10)

        # Summary Section
        pdf.set_font("Arial", 'B', 14)
        pdf.cell(200, 10, txt="Executive Summary", ln=True)
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 10, txt=f"Total Fire Events Detected: {stats['total_events']}", ln=True)
        pdf.cell(200, 10, txt=f"High Severity Incidents: {stats['severity_counts'].get('HIGH', 0)}", ln=True)
        pdf.cell(200, 10, txt=f"Medium Severity Incidents: {stats['severity_counts'].get('MEDIUM', 0)}", ln=True)
        pdf.cell(200, 10, txt=f"Average Confidence Score: {stats.get('avg_confidence', 0):.2f}", ln=True)
        pdf.ln(10)
        
        # Detailed Log Table
        pdf.set_font("Arial", 'B', 14)
        pdf.cell(200, 10, txt="Recent Fire Events Log", ln=True)
        pdf.set_font("Arial", 'B', 10)
        
        # Table Header
        pdf.cell(40, 10, "Timestamp", 1)
        pdf.cell(20, 10, "Severity", 1)
        pdf.cell(20, 10, "Conf", 1)
        pdf.cell(60, 10, "Location", 1)
        pdf.ln()
        
        # Table Rows
        pdf.set_font("Arial", size=10)
        for event in events[:50]: # Limit to last 50 for PDF
            timestamp = str(event['timestamp']) if event['timestamp'] else "N/A"
            # Truncate timestamp if too long
            if len(timestamp) > 19: timestamp = timestamp[:19]
            
            severity = str(event['severity'])
            conf = f"{float(event['confidence']):.2f}"
            
            lat = event.get('latitude')
            lon = event.get('longitude')
            loc = "N/A"
            if lat is not None and lon is not None:
                loc = f"{float(lat):.4f}, {float(lon):.4f}"
            
            pdf.cell(40, 10, timestamp, 1)
            pdf.cell(20, 10, severity, 1)
            pdf.cell(20, 10, conf, 1)
            pdf.cell(60, 10, loc, 1)
            pdf.ln()
            
        # Save PDF to a temporary file
        filename = "fire_analytics_report.pdf"
        pdf.output(filename)
        
        # Read the file and return as response
        with open(filename, "rb") as f:
            data = f.read()
            
        return Response(data, mimetype="application/pdf", headers={"Content-Disposition": "attachment;filename=fire_analytics_report.pdf"})
    except Exception as e:
        print(f"PDF Export Error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':

    # Initialize Database
    init_db()
    # Run server
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
