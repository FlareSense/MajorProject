import cv2
import os
import time
import winsound
from datetime import datetime
from ultralytics import YOLO

# Load Fire Detection Model
model = YOLO("best_v2.pt")

# Create evidence folder if not exists
if not os.path.exists("evidence"):
    os.makedirs("evidence")

CONFIDENCE_THRESHOLD = 0.60
ALARM_COOLDOWN = 5  # seconds between alarms
last_alarm_time = 0

def play_alarm():
    # Play alarm sound asynchronously (no freeze)
    winsound.PlaySound("alarm.wav", winsound.SND_FILENAME | winsound.SND_ASYNC)

def start_camera():
    global last_alarm_time

    cap = cv2.VideoCapture(0)
    fire_detected_last_frame = False

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame)
        fire_detected = False

        for box in results[0].boxes:
            conf = float(box.conf[0])
            cls = int(box.cls[0])
            label = model.names[cls]

            if label.lower() == "fire" and conf > CONFIDENCE_THRESHOLD:
                fire_detected = True

                x1, y1, x2, y2 = map(int, box.xyxy[0])

                # Draw bounding box
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
                cv2.putText(frame, f"FIRE {conf:.2f}",
                            (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                            (0, 0, 255), 2)

        if fire_detected:
            cv2.putText(frame, "!!! FIRE DETECTED !!!",
                        (50, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1,
                        (0, 0, 255), 3)

            current_time = time.time()

            # Alarm + save only if cooldown passed
            if current_time - last_alarm_time > ALARM_COOLDOWN:
                last_alarm_time = current_time

                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"evidence/fire_{timestamp}.jpg"
                cv2.imwrite(filename, frame)
                print(f"[ALERT] Fire detected! Image saved: {filename}")

                play_alarm()

        cv2.imshow("🔥 Fire Detection System", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    start_camera()
