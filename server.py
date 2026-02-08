import cv2
import time
import json
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from ultralytics import YOLO
import threading
import os
import numpy as np

# Import Alert Logic
from alert import play_alarm, send_email_alert, make_call_alert
from utils import save_fire_image

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
        
        detected_in_frame = False
        detections_list = []
        max_conf = 0.0
        max_severity = "None"
        
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

if __name__ == '__main__':
    # Run server
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
