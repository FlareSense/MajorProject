from ultralytics import YOLO

model = YOLO("best_v2.pt")
CONFIDENCE_THRESHOLD = 0.35

def detect_fire(frame):
    results = model(frame, imgsz=640, conf=0.35)
    fire_boxes = []

    for box in results[0].boxes:
        conf = float(box.conf[0])
        cls = int(box.cls[0])
        label = model.names[cls]

        if label.lower() == "fire" and conf > CONFIDENCE_THRESHOLD:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            fire_boxes.append((x1, y1, x2, y2, conf))

    return fire_boxes
