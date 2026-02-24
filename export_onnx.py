from ultralytics import YOLO
import time

def export_models():
    print("⏳ Starting ONNX Export Process...")
    start = time.time()
    
    # 1. Export Custom Fire Model
    print("\n🔥 Exporting best_v3.pt to ONNX format...")
    fire_model = YOLO("best_v3.pt")
    # Simplify=True applies graph optimizations. Half=True exports in FP16 for even faster speed bounds, but we'll stick to FP32 natively first.
    fire_path = fire_model.export(format="onnx", simplify=True, dynamic=False)
    print(f"✅ Fire Model exported to: {fire_path}")
    
    # 2. Export General YOLOv8 Nano Model
    print("\n🚶 Exporting yolov8n.pt to ONNX format...")
    person_model = YOLO("yolov8n.pt")
    person_path = person_model.export(format="onnx", simplify=True, dynamic=False)
    print(f"✅ Person Model exported to: {person_path}")

    end = time.time()
    print(f"\n🎉 EXPORT COMPLETE in {end - start:.2f} seconds.")

if __name__ == "__main__":
    export_models()
