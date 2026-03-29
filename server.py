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

from utils import save_fire_image, calculate_chaos, CHAOS_THRESHOLD, MIN_MOTION_PIXELS
from fpdf import FPDF
from database import init_db, log_detection, get_all_fire_events, get_analytics_stats, get_fire_event_by_id
import requests

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Load the exported ONNX models for hardware acceleration (Higher FPS)
# We reverted to the standard OPSET 17 versions but NOT 320x320 as it degrades accuracy
fire_model = YOLO("best_final.onnx")
person_model = YOLO("yolov8n.onnx") # Standard YOLO model for person detection

model_lock = threading.Lock() # Lock to synchronize ONNX inference across threads

# --- WARMUP YOLO MODELS (PREVENTS LAZY LOAD CRASH ON THREADS) ---
print("🔥 Warming up AI models on main thread...")
dummy_img = np.zeros((640, 640, 3), dtype=np.uint8)
fire_model(dummy_img, verbose=False)
person_model(dummy_img, verbose=False)
print("✅ Models ready.")

# Global variables
current_location = None # {lat: ..., lon: ...}
ALARM_COOLDOWN = 60
latest_frames = {"cam_0": None, "cam_1": None} # Central buffer for the web stream

# --- NEW MULTI-CAMERA CONFIGURATION ---
AVAILABLE_CAMERAS = {
    "cam_0": {
        "name": "Kitchen Video",
        "source": r"C:\Users\user\Downloads\WhatsApp Video 2026-03-16 at 11.24.57 PM.mp4" # Test Fire-like Demo
    },
    "cam_1": {
        "name": "Local Webcam",
        "source": 0 
    }
}

cameras_state = {}
for cam_id, cam_info in AVAILABLE_CAMERAS.items():
    cameras_state[cam_id] = {
        "active": False,
        "last_alarm_time": 0,
        "status": {
            "camera_id": cam_id,
            "detected": False,
            "confidence": 0.0,
            "timestamp": None,
            "location": cam_info["name"],
            "severity": "None",
            "fire_count": 0,
            "person_count": 0,
            "evacuation_needed": False,
            "message": "System Normal",
            "camera_active": False
        }
    }

def dispatch_alerts(frame, alert_state, current_loc, cam_name, evacuation_flag, max_sev, max_conf, max_chaos, has_fire):
    print(f"🔥 Alert Worker Triggered for {cam_name}. Forwarding Webhook to Java Backend...")
    from alert import upload_image_to_public_url
    
    # Save evidence locally for Java to fetch/reference
    img_path = save_fire_image(frame)
    img_filename = os.path.basename(img_path)
    
    # Send image to a stateless public CDN bucket so Telegram/WhatsApp can access the image bytes natively
    try:
        public_url = upload_image_to_public_url(img_path)
    except Exception as e:
        print(f"Failed to generate public URL: {e}")
        public_url = None
        
    img_url = public_url if public_url else f"http://127.0.0.1:5000/evidence/{img_filename}"
    
    # IP Fallback
    if not current_loc or 'lat' not in current_loc:
        try:
            resp = requests.get("http://ip-api.com/json/", timeout=5).json()
            if resp and resp.get("status") == "success":
                current_loc = {'lat': resp['lat'], 'lon': resp['lon']}
        except Exception as e:
            print(f"GPS Fallback Error: {e}")
            
    lat = current_loc['lat'] if current_loc else None
    lon = current_loc['lon'] if current_loc else None
    
    # Prepare JSON payload for Java
    payload = {
        "cameraName": cam_name,
        "hasFire": has_fire,
        "evacuationNeeded": evacuation_flag,
        "severity": max_sev.upper() if max_sev != "None" else "LOW",
        "confidence": float(max_conf),
        "chaos": float(max_chaos),
        "imageUrl": img_url,
        "latitude": lat,
        "longitude": lon,
        "message": alert_state.get("message", "")
    }
    
    try:
        response = requests.post("http://localhost:8080/api/internal/events", json=payload, timeout=5)
        print(f"✅ Webhook sent to Java. Status: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to reach Java Backend: {e}")

def video_capture_thread(camera_id):
    global cameras_state, current_location, latest_frames
    
    if camera_id not in AVAILABLE_CAMERAS:
        return
        
    cam_info = AVAILABLE_CAMERAS[camera_id]
    source = cam_info["source"]
    
    # Use DirectShow backend on Windows for local webcams to prevent hanging
    if isinstance(source, int) and os.name == 'nt':
        cap = cv2.VideoCapture(source, cv2.CAP_DSHOW)
    else:
        cap = cv2.VideoCapture(source)
    
    prev_gray = None # Initialize previous frame for optical flow
    frame_count = 0
    PROCESS_EVERY_N_FRAMES = 3 # Process every 3rd frame to guarantee fast visual FPS
    TARGET_FPS = 30 # Real-time playback for video files
    FRAME_DELAY = 1.0 / TARGET_FPS
    consecutive_empty_reads = 0

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    while True:
        state = cameras_state[camera_id]
        
        if not state["active"]:
            if cap.isOpened():
                cap.release()
                print(f"📷 Camera {camera_id} Resource Released (Privacy Mode)")
            
            # If camera is off, buffer a placeholder (black frame)
            blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(blank_frame, f"{cam_info['name']} OFF", (150, 240), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (100, 100, 100), 2)
            ret, buffer = cv2.imencode('.jpg', blank_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 65])
            latest_frames[camera_id] = buffer.tobytes()
            time.sleep(0.5)
            continue
            
        if not cap.isOpened():
             print(f"📷 Camera {camera_id} Resource Re-acquired")
             if isinstance(source, int) and os.name == 'nt':
                 cap.open(source, cv2.CAP_DSHOW)
             else:
                 cap.open(source)
             cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
             cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        success, frame = cap.read()
        
        # --- CPU SAVER: Pacing for Video Files ONLY ---
        if isinstance(source, str):
            time.sleep(FRAME_DELAY)
        
        if not success:
            consecutive_empty_reads += 1
            if consecutive_empty_reads > 50:
                print(f"📷 Camera {camera_id} Repeatedly Failed. Re-initializing...")
                cap.release()
                consecutive_empty_reads = 0
                time.sleep(1)
                continue
                
            # If stream ends (e.g. video file), loop it, or wait for reconnection
            if isinstance(source, str):
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            else:
                cap.release() # Release before attempting to reconnect
                continue
        else:
            consecutive_empty_reads = 0
            
        frame_count += 1
        
        # Only process every Nth frame to boost FPS
        if frame_count % PROCESS_EVERY_N_FRAMES != 0:
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 65])
            latest_frames[camera_id] = buffer.tobytes()
            continue
            
        # Convert to grayscale for optical flow and liveness detection later
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                
        fire_detected_in_frame = False
        fire_event_detected = False
        fire_detections = []
        person_detections = []
        max_fire_conf = 0.0
        max_severity = "None"
        max_chaos = 0.0
        overlay = frame.copy()
        
        # --- DUAL MODEL DETECTION ---
        # 1. Fire Detection (0.28 conf for high precision without false alarms)
        with model_lock:
            fire_results = fire_model(frame, verbose=False, conf=0.28)
        
        # --- PROCESS FIRE RESULTS ---
        for result in fire_results:
            for box in result.boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                label = fire_model.names[cls]
                
                # Dynamically clamp confidence to prevent false alarms on white surfaces
                is_valid_detection = False
                if label.lower() == "fire" and conf > 0.28:
                    is_valid_detection = True
                elif label.lower() == "smoke" and conf > 0.48: # High threshold strictly for amorphous smoke shapes
                    is_valid_detection = True
                
                if is_valid_detection:
                    fire_detected_in_frame = True
                    if label.lower() == "fire":
                        fire_event_detected = True
                    max_fire_conf = max(max_fire_conf, conf)
                    
                    # Original bounding box coordinates are correct because YOLO handles internal scaling
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
                             fire_detected_in_frame = False 
                             conf = 0.0 
                         elif chaos < CHAOS_THRESHOLD:
                             severity = "Shaking (Fake)"
                             color = (255, 165, 0) # Orange
                             fire_detected_in_frame = False
                             conf = 0.0
                         else:
                             fire_detected_in_frame = True
                             max_chaos = chaos

                    fire_detections.append({"severity": severity, "conf": conf})

                    # Draw Fire/Smoke Box
                    cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1) 
                    
                    label_text = f"{label.upper()} {severity.upper()} {conf:.2f}"
                    t_size = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
                    cv2.rectangle(frame, (x1, y1 - t_size[1] - 10), (x1 + t_size[0] + 10, y1), color, -1)
                    cv2.putText(frame, label_text, (x1 + 5, y1 - 5), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                                
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    
        # --- CONDITIONAL PERSON DETECTION (CPU SAVER) ---
        # Only run the heavy person detection model IF a fire is actually detected 
        # (or once every 30 frames just to keep the frontend person count vaguely updated)
        if fire_detected_in_frame or (frame_count % 30 == 0):
            with model_lock:
                person_results = person_model(frame, classes=[0], verbose=False, conf=0.40)
            # --- PROCESS PERSON RESULTS ---
            for result in person_results:
                for box in result.boxes:
                    # Class 0 is Person in COCO
                    conf = float(box.conf[0])
                    person_detections.append({"conf": conf})
                    
                    # Original boxes map correctly to original frame
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    p_color = (255, 255, 0) # Cyan/Yellow for people
                    
                    # Draw Person Box
                    cv2.rectangle(overlay, (x1, y1), (x2, y2), p_color, -1)
                    
                    p_label = f"PERSON {conf:.2f}"
                    t_size = cv2.getTextSize(p_label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
                    cv2.rectangle(frame, (x1, y1 - t_size[1] - 8), (x1 + t_size[0] + 8, y1), p_color, -1)
                    cv2.putText(frame, p_label, (x1 + 4, y1 - 4), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
                                
                    cv2.rectangle(frame, (x1, y1), (x2, y2), p_color, 2)
        
        # Apply transparency to overlaid boxes
        if len(fire_detections) > 0 or len(person_detections) > 0:
            alpha = 0.35
            frame = cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0)

        # Update global status
        person_count = len(person_detections)
        fire_count = len(fire_detections)
        
        state["status"]["person_count"] = person_count
        
        if fire_detected_in_frame:
            state["status"]["detected"] = True
            state["status"]["confidence"] = float(max_fire_conf)
            state["status"]["timestamp"] = time.time()
            state["status"]["severity"] = max_severity
            state["status"]["fire_count"] = fire_count
            
            # --- EVACUATION LOGIC ---
            evacuation_needed = (person_count > 0)
            state["status"]["evacuation_needed"] = evacuation_needed
            
            if evacuation_needed:
                state["status"]["message"] = f"CRITICAL: FIRE/SMOKE & {person_count} PERSON(S) DETECTED! EVACUATE {cam_info['name']} IMMEDTATELY!"
            elif max_severity == "High":
                state["status"]["message"] = f"CRITICAL: {fire_count} FIRE/SMOKE DETECTED in {cam_info['name']}!"
            else:
                state["status"]["message"] = f"Warning: {fire_count} Hazard(s) Visible in {cam_info['name']}"

            # Alert Logic
            current_time = time.time()
            if current_time - state["last_alarm_time"] > ALARM_COOLDOWN:
                print(f"🔥 Alert Triggered on {camera_id}! Evacuation Needed: {evacuation_needed}")
                
                # Copy frame immediately to prevent background thread from getting a modified frame later
                frame_to_save = frame.copy()
                
                # Spawn single worker thread to handle saving and sub-alerts
                threading.Thread(
                    target=dispatch_alerts, 
                    args=(frame_to_save, dict(state["status"]), current_location, cam_info['name'], evacuation_needed, max_severity, max_fire_conf, max_chaos, fire_event_detected), 
                    daemon=True
                ).start()

                state["last_alarm_time"] = current_time
        else:
            if state["status"]["timestamp"] and (time.time() - state["status"]["timestamp"] > 3):
                state["status"]["detected"] = False
                state["status"]["confidence"] = 0.0
                state["status"]["severity"] = "None"
                state["status"]["fire_count"] = 0
                state["status"]["evacuation_needed"] = False
                state["status"]["message"] = f"{person_count} Person(s) present" if person_count > 0 else "System Normal"

        ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 65])
        latest_frames[camera_id] = buffer.tobytes()
        
        prev_gray = gray.copy()

def generate_frames(camera_id):
    # This pure HTTP generator simply yields from the centralized buffer infinitely
    while True:
        frame = latest_frames.get(camera_id)
        if frame is not None:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        # Hard delay to stream at a constant 30 FPS via HTTP regardless of processing FPS
        time.sleep(1.0 / 30.0)

@app.route('/video_feed/<camera_id>')
def video_feed(camera_id):
    if camera_id not in AVAILABLE_CAMERAS:
        return "Camera not found", 404
    return Response(generate_frames(camera_id), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/status')
def get_status():
    # Return status of ALL cameras
    all_status = {cam_id: state["status"] for cam_id, state in cameras_state.items()}
    return jsonify(all_status)

@app.route('/api/location', methods=['POST'])
def update_location():
    global current_location
    data = request.json
    if data and 'lat' in data and 'lon' in data:
        current_location = data
        print(f"📍 Location Updated: {current_location['lat']}, {current_location['lon']}")
        return jsonify({"status": "updated", "location": current_location})
    return jsonify({"status": "error"}), 400

@app.route('/api/camera/toggle', methods=['POST'])
def toggle_camera():
    global cameras_state
    data = request.json
    if 'camera_id' in data and 'active' in data:
        camera_id = data['camera_id']
        active = data['active']
        
        if camera_id in cameras_state:
            cameras_state[camera_id]['active'] = active
            cameras_state[camera_id]['status']['camera_active'] = active
            status_msg = "ON" if active else "OFF"
            print(f"📷 Camera {camera_id} toggled {status_msg}")
            return jsonify({"status": "success", "camera_id": camera_id, "active": active})
    
    return jsonify({"status": "error"}), 400

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

@app.route('/api/cameras')
def get_cameras():
    # Helper endpoint to get available cameras
    return jsonify(AVAILABLE_CAMERAS)

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

    # Pre-spawn permanent background capture threads for hardware cameras
    for cam_id in AVAILABLE_CAMERAS.keys():
        threading.Thread(target=video_capture_thread, args=(cam_id,), daemon=True).start()
    # Run server
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True) # debug=False to avoid Flask double-reloading the models
