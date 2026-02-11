import os
from datetime import datetime
import cv2
import numpy as np

# Liveness parameters
# Lower motion threshold to detect small fires (matches)
MIN_MOTION_PIXELS = 20
# Chaos threshold: Real fire moves in many directions (High Variance)
# Shaking moves in one direction (Low Variance)
CHAOS_THRESHOLD = 0.15  # Lower threshold to accept less chaotic but still real small fires

if not os.path.exists("evidence"):
    os.makedirs("evidence")

def save_fire_image(frame):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"evidence/fire_{timestamp}.jpg"
    cv2.imwrite(filename, frame)
    return filename

def calculate_chaos(curr_gray, prev_gray, x1, y1, x2, y2):
    # Extract ROI
    curr_roi = curr_gray[y1:y2, x1:x2]
    prev_roi = prev_gray[y1:y2, x1:x2]
    
    if curr_roi.shape != prev_roi.shape or curr_roi.size == 0:
        return 0, 0

    # Downsample for performance (Optical flow is expensive)
    # We resize to a small fixed size to make the calculation fast
    curr_small = cv2.resize(curr_roi, (64, 64))
    prev_small = cv2.resize(prev_roi, (64, 64))

    # Calculate Optical Flow (Farneback)
    flow = cv2.calcOpticalFlowFarneback(prev_small, curr_small, None, 
                                        0.5, 3, 15, 3, 5, 1.2, 0)
    
    # Calculate Magnitude and Angle
    mag, ang = cv2.cartToPolar(flow[..., 0], flow[..., 1])
    
    # Keep only significant motion
    mask = mag > 1.0
    valid_angles = ang[mask]
    
    if len(valid_angles) < 10:
        return 0, 0  # No significant motion
    
    # Calculate Variance of Angles (Chaos)
    # Circular standard deviation would be better but simple std is okay for this
    # We normalize angles to 0-1 range to avoid wrapping issues somewhat or use sin/cos
    # A simple trick: if vectors point in all directions, std dev is high.
    
    chaos_score = np.std(valid_angles)
    magnitude_score = np.mean(mag[mask])
    
    return chaos_score, magnitude_score
