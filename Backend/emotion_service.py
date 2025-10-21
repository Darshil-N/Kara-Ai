import sys
import json
import base64
import os
import cv2
import numpy as np
from ultralytics import YOLO

# -------------------------------------------------------------
# Emotion Detection Service (line-oriented stdin/stdout JSON)
# -------------------------------------------------------------
# STARTUP COST: loads YOLO model + Haar cascade once, then processes
# frames sent as JSON lines on stdin:
# {"id": "req-id", "image": "data:image/jpeg;base64,..."}
# RETURNS (one line JSON):
# {"id": "req-id", "faces": [...], "dominantEmotion": "Happy"}
# No GUI windows, no webcam. Serves the Node backend.
# -------------------------------------------------------------

MODEL_PATH = os.environ.get("EMOTION_MODEL_PATH") or os.path.join(os.path.dirname(__file__), "best.pt")
EMOTION_MODE = os.environ.get("EMOTION_MODE", "cascade")  # cascade | direct | hybrid

emotions = ['Anger', 'Contempt', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise']
colors_bgr = {
    'Anger': (0, 0, 255),
    'Contempt': (128, 0, 128),
    'Disgust': (0, 128, 0),
    'Fear': (0, 255, 255),
    'Happy': (0, 255, 0),
    'Neutral': (255, 255, 255),
    'Sad': (255, 0, 0),
    'Surprise': (0, 165, 255)
}

def bgr_to_rgb_hex(bgr):
    b, g, r = bgr
    return f"#{r:02X}{g:02X}{b:02X}"

try:
    model = YOLO(MODEL_PATH)
except Exception as e:
    print(json.dumps({"error": f"Failed to load model: {e}"}))
    sys.stdout.flush()
    sys.exit(1)

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def process_frame(frame_bgr):
    h_frame, w_frame = frame_bgr.shape[:2]
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    faces = []
    if EMOTION_MODE in ("cascade", "hybrid"):
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(100, 100),
            flags=cv2.CASCADE_SCALE_IMAGE
        )

    results_output = []
    emotion_counts = {}
    debug_entries = []

    for (x, y, w, h) in faces:
        padding = 20
        x1 = max(0, x - padding)
        y1 = max(0, y - padding)
        x2 = min(frame_bgr.shape[1], x + w + padding)
        y2 = min(frame_bgr.shape[0], y + h + padding)
        face_roi = frame_bgr[y1:y2, x1:x2]
        if face_roi.shape[0] < 50 or face_roi.shape[1] < 50:
            continue
        try:
            # lower conf threshold to allow more detections; frontend can filter visually
            results = model(face_roi, conf=0.05, verbose=False)
        except Exception:
            continue
        best_emotion = None
        best_conf = 0.0
        roi_box_count = 0
        for result in results:
            boxes = getattr(result, 'boxes', None)
            # Detection path
            if boxes is not None and len(boxes) > 0:
                for box in boxes:
                    try:
                        confidence = float(box.conf[0])
                        class_id = int(box.cls[0])
                    except Exception:
                        continue
                    roi_box_count += 1
                    if confidence > best_conf:
                        best_conf = confidence
                        if 0 <= class_id < len(emotions):
                            best_emotion = emotions[class_id]
            else:
                # Classification path (no boxes, look for probs)
                probs = getattr(result, 'probs', None)
                if probs is not None:
                    try:
                        cls_tensor = probs.top1
                        conf_tensor = probs.top1conf
                        class_id = int(cls_tensor) if cls_tensor is not None else None
                        confidence = float(conf_tensor) if conf_tensor is not None else 0.0
                        if class_id is not None and 0 <= class_id < len(emotions):
                            if confidence > best_conf:
                                best_conf = confidence
                                best_emotion = emotions[class_id]
                                debug_entry = locals().get('debug_entry', {})
                                debug_entry['classification'] = True
                    except Exception:
                        pass
        debug_entry = {
            "faceRect": [int(x1), int(y1), int(x2), int(y2)],
            "roiBoxes": roi_box_count,
            "bestConf": round(best_conf,4)
        }
        if best_emotion is None:
            # fallback attempt on whole frame
            try:
                full_results = model(frame_bgr, conf=0.05, verbose=False)
                full_best_conf = 0.0
                full_best_emotion = None
                full_box_count = 0
                for fr in full_results:
                    fboxes = getattr(fr, 'boxes', None)
                    if fboxes is None:
                        continue
                    for fbox in fboxes:
                        try:
                            fconf = float(fbox.conf[0])
                            fcls = int(fbox.cls[0])
                        except Exception:
                            continue
                        full_box_count += 1
                        if fconf > full_best_conf:
                            full_best_conf = fconf
                            if 0 <= fcls < len(emotions):
                                full_best_emotion = emotions[fcls]
                debug_entry["fallbackFullBoxes"] = full_box_count
                if full_best_emotion and full_best_conf > best_conf:
                    best_emotion = full_best_emotion
                    best_conf = full_best_conf
                    debug_entry["fallbackUsed"] = True
                    debug_entry["fallbackBestConf"] = round(full_best_conf,4)
            except Exception as fe:
                debug_entry["fallbackError"] = str(fe)
        if best_emotion:
            emotion_counts[best_emotion] = emotion_counts.get(best_emotion, 0) + 1
            color_hex = bgr_to_rgb_hex(colors_bgr[best_emotion])
        else:
            color_hex = "#FFFFFF"  # no emotion yet
        # Ensure coordinates within bounds
        x1c = max(0, min(int(x1), w_frame-1))
        y1c = max(0, min(int(y1), h_frame-1))
        x2c = max(0, min(int(x2), w_frame))
        y2c = max(0, min(int(y2), h_frame))
        results_output.append({
            "x1": x1c,
            "y1": y1c,
            "x2": x2c,
            "y2": y2c,
            "emotion": best_emotion,
            "confidence": round(best_conf, 4),
            "color": color_hex
        })
        debug_entries.append(debug_entry)
    # If no faces found or no emotions detected and mode allows, attempt direct full-frame detection
    if (not results_output or all(r.get("emotion") is None for r in results_output)) and EMOTION_MODE in ("direct", "hybrid"):
        try:
            direct_results = model(frame_bgr, conf=0.25, verbose=False)
            picked = []
            for dr in direct_results:
                dboxes = getattr(dr, 'boxes', None)
                if dboxes is None:
                    continue
                for dbox in dboxes:
                    try:
                        conf = float(dbox.conf[0])
                        cls_id = int(dbox.cls[0])
                    except Exception:
                        continue
                    if 0 <= cls_id < len(emotions):
                        bxyxy = dbox.xyxy[0].tolist() if hasattr(dbox, 'xyxy') else None
                        if bxyxy:
                            x1d, y1d, x2d, y2d = bxyxy
                        else:
                            x1d, y1d, x2d, y2d = 0,0,w_frame,h_frame
                        x1d = int(max(0, min(x1d, w_frame-1)))
                        y1d = int(max(0, min(y1d, h_frame-1)))
                        x2d = int(max(0, min(x2d, w_frame)))
                        y2d = int(max(0, min(y2d, h_frame)))
                        picked.append({
                            "x1": x1d,
                            "y1": y1d,
                            "x2": x2d,
                            "y2": y2d,
                            "emotion": emotions[cls_id],
                            "confidence": round(conf,4),
                            "color": bgr_to_rgb_hex(colors_bgr[emotions[cls_id]]),
                            "source": "direct"
                        })
            if picked:
                results_output = picked
                debug_entries.append({"directDetections": len(picked)})
        except Exception as de:
            debug_entries.append({"directError": str(de)})

    if results_output:
        # recompute dominant from results_output if cascade counts empty
        if not emotion_counts:
            for r in results_output:
                if r.get("emotion"):
                    emotion_counts[r["emotion"]] = emotion_counts.get(r["emotion"], 0) + 1
    if emotion_counts:
        dominant = max(emotion_counts.items(), key=lambda kv: kv[1])[0]
    else:
        dominant = None
    return results_output, dominant, {"width": w_frame, "height": h_frame}, debug_entries

def main_loop():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
            req_id = payload.get("id")
            image_data = payload.get("image")
            if not image_data:
                raise ValueError("Missing image")
            # Strip data URL prefix if present
            if "," in image_data:
                image_data = image_data.split(",", 1)[1]
            img_bytes = base64.b64decode(image_data)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                raise ValueError("Failed to decode image")
            faces, dominant, dims, dbg = process_frame(frame)
            out = {"id": req_id, "faces": faces, "dominantEmotion": dominant, "frame": dims, "debug": dbg}
        except Exception as e:
            out = {"id": payload.get("id") if 'payload' in locals() else None, "error": str(e), "faces": [], "dominantEmotion": None}
        print(json.dumps(out, ensure_ascii=False))
        sys.stdout.flush()

if __name__ == "__main__":
    main_loop()
