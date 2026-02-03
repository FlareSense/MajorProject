import os
from datetime import datetime
import cv2

if not os.path.exists("evidence"):
    os.makedirs("evidence")

def save_fire_image(frame):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"evidence/fire_{timestamp}.jpg"
    cv2.imwrite(filename, frame)
    return filename
