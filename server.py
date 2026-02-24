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
from alert import play_alarm, send_email_alert, make_call_alert, send_telegram_alert, send_whatsapp_alert
from utils import save_fire_image, calculate_chaos, CHAOS_THRESHOLD, MIN_MOTION_PIXELS
from database import init_db, log_detection

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Load the exported ONNX models for hardware acceleration (Higher FPS)
fire_model = YOLO("best_v3.onnx")
person_model = YOLO("yolov8n.onnx") # Standard YOLO model for person detection

# Global variables
current_location = None # {lat: ..., lon: ...}
ALARM_COOLDOWN = 60

# --- NEW MULTI-CAMERA CONFIGURATION ---
AVAILABLE_CAMERAS = {
    "cam_0": {
        "name": "Kitchen Video",
        "source": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" # Test Fire-like Demo
    },
    "cam_1": {
        "name": "Local Webcam",
        "source": 0 
    }
}

cameras_state = {}
for cam_id, cam_info in AVAILABLE_CAMERAS.items():
    cameras_state[cam_id] = {
        "active": True,
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
            "camera_active": True
        }
    }

def generate_frames(camera_id):
    global cameras_state, current_location
    
    if camera_id not in AVAILABLE_CAMERAS:
        return
        
    cam_info = AVAILABLE_CAMERAS[camera_id]
    source = cam_info["source"]
    cap = cv2.VideoCapture(source)
    
    prev_gray = None # Initialize previous frame for optical flow

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    while True:
        state = cameras_state[camera_id]
        
        if not state["active"]:
            if cap.isOpened():
                cap.release()
                print(f"📷 Camera {camera_id} Resource Released (Privacy Mode)")
            
            # If camera is off, yield a placeholder (black frame)
            blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(blank_frame, f"{cam_info['name']} OFF", (150, 240), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (100, 100, 100), 2)
            ret, buffer = cv2.imencode('.jpg', blank_frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            time.sleep(0.5)
            continue
            
        if not cap.isOpened():
             print(f"📷 Camera {camera_id} Resource Re-acquired")
             cap.open(source)
             cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
             cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        success, frame = cap.read()
        if not success:
            # If stream ends (e.g. video file), loop it, or wait for reconnection
            if isinstance(source, str):
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            break
        
        # --- DUAL MODEL DETECTION ---
        # 1. Fire Detection
        fire_results = fire_model(frame, verbose=False, conf=0.30)
        # 2. Person Detection (class 0 only)
        person_results = person_model(frame, classes=[0], verbose=False, conf=0.40)
        
        # Convert to grayscale for optical flow
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        fire_detected_in_frame = False
        fire_detections = []
        person_detections = []
        
        max_fire_conf = 0.0
        max_severity = "None"
        max_chaos = 0.0
        
        # Overlay for transparent drawing
        overlay = frame.copy()
        
        # --- PROCESS FIRE RESULTS ---
        for result in fire_results:
            for box in result.boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                label = fire_model.names[cls]
                
                if label.lower() == "fire" and conf > 0.30:
                    fire_detected_in_frame = True
                    max_fire_conf = max(max_fire_conf, conf)
                    
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

                    # Draw Fire Box
                    cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1) 
                    
                    label_text = f"FIRE {severity.upper()} {conf:.2f}"
                    t_size = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
                    cv2.rectangle(frame, (x1, y1 - t_size[1] - 10), (x1 + t_size[0] + 10, y1), color, -1)
                    cv2.putText(frame, label_text, (x1 + 5, y1 - 5), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                                
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    
        # --- PROCESS PERSON RESULTS ---
        for result in person_results:
            for box in result.boxes:
                # Class 0 is Person in COCO
                conf = float(box.conf[0])
                person_detections.append({"conf": conf})
                
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
                state["status"]["message"] = f"CRITICAL: FIRE & {person_count} PERSON(S) DETECTED! EVACUATE {cam_info['name']} IMMEDTATELY!"
            elif max_severity == "High":
                state["status"]["message"] = f"CRITICAL: {fire_count} FIRE(S) DETECTED in {cam_info['name']}!"
            else:
                state["status"]["message"] = f"Warning: {fire_count} Fire(s) Visible in {cam_info['name']}"

            # Alert Logic
            current_time = time.time()
            if current_time - state["last_alarm_time"] > ALARM_COOLDOWN:
                print(f"🔥 Alert Triggered on {camera_id}! Evacuation Needed: {evacuation_needed}")
                
                loc_url = "GPS Unavailable"
                if current_location:
                    loc_url = f"https://maps.google.com/?q={current_location['lat']},{current_location['lon']}"

                threading.Thread(target=play_alarm, daemon=True).start()
                img_path = save_fire_image(frame)
                
                msg_text = state["status"]["message"]
                
                threading.Thread(target=send_email_alert, args=(img_path, current_location), daemon=True).start()
                threading.Thread(target=make_call_alert, args=(max_severity, loc_url), daemon=True).start()
                
                # --- NEW BOT ALERTS ---
                threading.Thread(target=send_telegram_alert, args=(img_path, current_location, msg_text, max_severity), daemon=True).start()
                threading.Thread(target=send_whatsapp_alert, args=(current_location, msg_text, max_severity), daemon=True).start()
                
                lat = current_location['lat'] if current_location else None
                lon = current_location['lon'] if current_location else None
                
                db_severity = "CRITICAL" if evacuation_needed else ("HIGH" if max_severity.lower() == "high" else ("MEDIUM" if max_severity.lower() == "medium" else "LOW"))
                log_chaos = max_chaos
                
                threading.Thread(target=log_detection, args=(
                    max_fire_conf, 
                    log_chaos, 
                    db_severity, 
                    cam_info['name'], 
                    img_path, 
                    True, 
                    lat, 
                    lon, 
                    loc_url
                ), daemon=True).start()

                state["last_alarm_time"] = current_time
        else:
            if state["status"]["timestamp"] and (time.time() - state["status"]["timestamp"] > 3):
                state["status"]["detected"] = False
                state["status"]["confidence"] = 0.0
                state["status"]["severity"] = "None"
                state["status"]["fire_count"] = 0
                state["status"]["evacuation_needed"] = False
                state["status"]["message"] = f"{person_count} Person(s) present" if person_count > 0 else "System Normal"

        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        
        prev_gray = gray.copy()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

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

@app.route('/api/cameras')
def get_cameras():
    # Helper endpoint to get available cameras
    return jsonify(AVAILABLE_CAMERAS)

if __name__ == '__main__':
    # Initialize Database
    init_db()
    # Run server
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
