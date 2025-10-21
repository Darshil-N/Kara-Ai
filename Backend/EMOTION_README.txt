Emotion Detection Integration
--------------------------------

Requirements:
1. Python 3.9+ installed and available as `python` (or set env PYTHON_EXECUTABLE)
2. Install dependencies:
   pip install opencv-python-headless ultralytics numpy
3. Place your YOLO emotion model at Backend/best.pt (or set EMOTION_MODEL_PATH env var).

Runtime:
Node backend will auto-spawn the Python process when starting. It exposes:
POST http://localhost:8080/api/emotion/frame { image: "data:image/jpeg;base64,..." }
Response: { success, faces:[{x1,y1,x2,y2,emotion,confidence,color}], dominantEmotion }

Frontend periodically captures frames (1 FPS) when camera is on, overlays boxes, and stores a 25s rolling dominant emotion snapshot included with AI answer (as `Emotion:<value>` appended).

Colors match original spec. No extra services added.
