import cv2
import time
from detector import detect_fire
from alert import play_alarm, send_email_alert
from utils import save_fire_image

ALARM_COOLDOWN = 5
last_alarm_time = 0

def main():
    global last_alarm_time

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        fire_boxes = detect_fire(frame)

        for (x1, y1, x2, y2, conf) in fire_boxes:
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
            cv2.putText(frame, f"FIRE {conf:.2f}",
                        (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                        (0, 0, 255), 2)

        if fire_boxes:
            cv2.putText(frame, "!!! FIRE DETECTED !!!",
                        (50, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1,
                        (0, 0, 255), 3)

            current_time = time.time()
            if current_time - last_alarm_time > ALARM_COOLDOWN:
                last_alarm_time = current_time

                image_path = save_fire_image(frame)
                play_alarm()
                send_email_alert(image_path)

        cv2.imshow("🔥 Fire Detection System", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
