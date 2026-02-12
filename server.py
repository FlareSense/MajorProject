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

# Import Alert Logic
from alert import play_alarm, send_email_alert, make_call_alert
from utils import save_fire_image, calculate_chaos, CHAOS_THRESHOLD, MIN_MOTION_PIXELS
from fpdf import FPDF
from database import init_db, log_detection, get_all_fire_events, get_analytics_stats, get_fire_event_by_id

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Load the new trained model
model = YOLO("best_v2.pt")

# Global variables
current_location = None # {lat: ..., lon: ...}
last_alarm_time = 0
ALARM_COOLDOWN = 60
camera_active = True

fire_status = {
    "detected": False,
    "confidence": 0.0,
    "timestamp": None,
    "location": "Camera 1 (Main)",
    "severity": "None",
    "count": 0,
    "message": "System Normal",
    "camera_active": True
}

def generate_frames():
    global fire_status, last_alarm_time, current_location, camera_active
    cap = cv2.VideoCapture(0)
    
    prev_gray = None # Initialize previous frame for optical flow

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    while True:
        if not camera_active:
            if cap.isOpened():
                cap.release()
                print("📷 Camera Resource Released (Privacy Mode)")
            
            # If camera is off, yield a placeholder (black frame)
            blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(blank_frame, "CAMERA OFF", (200, 240), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (100, 100, 100), 2)
            ret, buffer = cv2.imencode('.jpg', blank_frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            time.sleep(0.5)
            continue
            
        if not cap.isOpened():
             print("📷 Camera Resource Re-acquired")
             cap.open(0)
             cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
             cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        success, frame = cap.read()
        if not success:
            break
        
        # Run detection
        results = model(frame, verbose=False, conf=0.30)
        
        # Convert to grayscale for optical flow
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        detected_in_frame = False
        detections_list = []
        max_conf = 0.0
        max_conf = 0.0
        max_severity = "None"
        max_chaos = 0.0
        
        # Overlay for transparent drawing
        overlay = frame.copy()
        
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
                         # Ensure coords are within bounds
                         h, w = gray.shape
                         cx1, cy1 = max(0, x1), max(0, y1)
                         cx2, cy2 = min(w, x2), min(h, y2)
                         
                         chaos, motion_mag = calculate_chaos(gray, prev_gray, cx1, cy1, cx2, cy2)
                         
                         print(f"DEBUG: Chaos={chaos:.4f} (Thresh={CHAOS_THRESHOLD}), Motion={motion_mag:.4f} (Thresh=0.3)")

                         # Filter out static images or shaking photos
                         # If it's static (low motion) OR organized motion (low chaos but high motion = shaking)
                         if motion_mag < 0.3:
                             severity = "Static (Fake)"
                             color = (255, 0, 0) # Blue
                             # Don't mark as detected_in_frame if it's static
                             detected_in_frame = False 
                             conf = 0.0 # Suppress confidence
                         elif chaos < CHAOS_THRESHOLD:
                             severity = "Shaking (Fake)"
                             color = (255, 165, 0) # Orange
                             detected_in_frame = False
                             conf = 0.0
                         else:
                             # Real Fire!
                             detected_in_frame = True
                             max_chaos = chaos

                    # If first frame or check passed (if we set detected_in_frame = True above)
                    # Note: We rely on detected_in_frame flag primarily
                    if severity in ["Static (Fake)", "Shaking (Fake)"]:
                         # It was detected by YOLO but rejected by Liveness
                         pass 
                    else:
                        # Re-evaluate severity based on coverage IF it is real
                        pass # kept previous severity logic but we need to ensure detected_in_frame matches

                    detections_list.append({"severity": severity, "conf": conf})

                    # DRAWING: Semi-transparent Fill
                    # Draw filled box on overlay
                    cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1) 
                    
                    # Text Label with Background
                    label_text = f"{severity.upper()} {conf:.2f}"
                    t_size = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
                    cv2.rectangle(frame, (x1, y1 - t_size[1] - 10), (x1 + t_size[0] + 10, y1), color, -1)
                    cv2.putText(frame, label_text, (x1 + 5, y1 - 5), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                                
                    # Draw Border on original frame (to keep edges sharp)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

        # Apply transparency
        if detected_in_frame:
            alpha = 0.35
            frame = cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0)

        # Update global status
        if detected_in_frame:
            fire_status["detected"] = True
            fire_status["confidence"] = float(max_conf)
            fire_status["timestamp"] = time.time()
            fire_status["severity"] = max_severity
            fire_status["count"] = len(detections_list)
            
            if max_severity == "High":
                fire_status["message"] = f"CRITICAL: {len(detections_list)} FIRE(S) DETECTED!"
            else:
                 fire_status["message"] = f"Warning: {len(detections_list)} Fire(s) Visible"

            # Alert Logic
            current_time = time.time()
            if current_time - last_alarm_time > ALARM_COOLDOWN:
                print(f"🔥 Alert Triggered! Severity: {max_severity}")
                
                # Generate Google Maps URL
                loc_url = "GPS Unavailable"
                if current_location:
                    loc_url = f"https://maps.google.com/?q={current_location['lat']},{current_location['lon']}"

                threading.Thread(target=play_alarm, daemon=True).start()
                img_path = save_fire_image(frame)
                
                # Send Notifications (Email + Voice Call)
                threading.Thread(target=send_email_alert, args=(img_path, current_location), daemon=True).start()
                threading.Thread(target=make_call_alert, args=(max_severity, loc_url), daemon=True).start()
                
                # Log to MySQL Database
                print("DEBUG: Triggering Database Log...")
                lat = current_location['lat'] if current_location else None
                lon = current_location['lon'] if current_location else None
                
                # We map max_severity to LOW/MEDIUM/HIGH for ENUM compatibility
                db_severity = "HIGH"
                if max_severity.lower() == "medium": db_severity = "MEDIUM"
                if max_severity.lower() == "low": db_severity = "LOW"

                # Calculate chaos for the FIRST detected box just for logging (approximate)
                # In reality we iterate multiple boxes, but we'll log the "event"
                # We can use the last calculated chaos from the loop above if available, 
                # but 'chaos' variable scope might be inside loop. 
                # Let's assume high chaos if it triggered 'High/Real Fire'.
                # To be precise, we should have captured specific chaos of the triggering box.
                # For now, we will log the chaos of the last processed box or a default high value.
                log_chaos = max_chaos # Use actual captured chaos
                
                threading.Thread(target=log_detection, args=(
                    max_conf, 
                    log_chaos, 
                    db_severity, 
                    "Camera 1", 
                    img_path, 
                    True, # Alert Sent
                    lat, 
                    lon, 
                    loc_url
                ), daemon=True).start()

                last_alarm_time = current_time
        else:
            if fire_status["timestamp"] and (time.time() - fire_status["timestamp"] > 3):
                fire_status["detected"] = False
                fire_status["confidence"] = 0.0
                fire_status["severity"] = "None"
                fire_status["count"] = 0
                fire_status["message"] = "System Normal"

        # Encode frame
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        
        # Update prev_gray
        prev_gray = gray.copy()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/status')
def get_status():
    return jsonify(fire_status)

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
    global camera_active
    data = request.json
    if 'active' in data:
        camera_active = data['active']
        fire_status['camera_active'] = camera_active
        status_msg = "ON" if camera_active else "OFF"
        print(f"📷 Camera toggled {status_msg}")
        return jsonify({"status": "success", "camera_active": camera_active})
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
