import cv2
import time
import numpy as np
from detector import detect_fire
from alert import play_alarm, send_email_alert
from utils import save_fire_image, calculate_chaos, MIN_MOTION_PIXELS, CHAOS_THRESHOLD

ALARM_COOLDOWN = 60
last_alarm_time = 0

ALARM_COOLDOWN = 60
last_alarm_time = 0

prev_gray = None



def main():
    global last_alarm_time, prev_gray

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    print("System Started. Press 'q' to exit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect Fire
        fire_boxes = detect_fire(frame)

        detected_real_fire = False

        if prev_gray is not None and fire_boxes:
            for (x1, y1, x2, y2, conf) in fire_boxes:
                # Ensure ROI is valid
                h, w = gray.shape
                x1 = max(0, x1); y1 = max(0, y1)
                x2 = min(w, x2); y2 = min(h, y2)
                
                chaos, motion_mag = calculate_chaos(gray, prev_gray, x1, y1, x2, y2)
                
                # Logic:
                # 1. Matches: Chaos > Threshold (0.15), Motion > Min (20)
                # 2. Shaking Photo: Chaos < Threshold, Motion > Min
                # 3. Static Photo: Motion < Min

                label = "Analyzing..."
                color = (0, 255, 255) # Yellow
                
                # Check magnitude (Motion) first
                # We use motion_mag (average flow magnitude) as a proxy for movement intensity
                if motion_mag < 0.2:
                   label = "Static"
                   color = (255, 0, 0) # Blue
                
                # If motion is present but coherent (Low Chaos), it's likely shaking
                elif chaos < CHAOS_THRESHOLD:
                    label = "Shaking Detected"
                    color = (255, 165, 0) # Orange
                
                # High Chaos = Real Fire
                else:
                    label = "REAL FIRE"
                    color = (0, 255, 0) # Green
                    detected_real_fire = True

                # Draw info
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)
                cv2.putText(frame, f"{label} (C:{chaos:.2f})", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        prev_gray = gray.copy()

        if detected_real_fire:
            current_time = time.time()
            if current_time - last_alarm_time > ALARM_COOLDOWN:
                last_alarm_time = current_time
                play_alarm()
                # Run in thread or async to avoid lag, but for now direct call
                try: 
                    image_path = save_fire_image(frame)
                    send_email_alert(image_path)
                except Exception as e:
                    print(f"Alert Error: {e}")

            cv2.putText(frame, "!!! FIRE ALARM !!!", (50, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)

        cv2.imshow("Advanced Fire Liveness Detector", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
