from ultralytics import YOLO

STAGE2_PATH = "models/stage2_v3_best.pt"
model = YOLO(STAGE2_PATH)  # loaded once at startup


def identify_species(image_path, conf=0.25):
    result = model.predict(image_path, conf=conf, verbose=False)[0]
    detections = []
    for box in result.boxes:
        detections.append({
            "species": result.names[int(box.cls[0])],
            "confidence": float(box.conf[0]),
            "bbox": [float(v) for v in box.xyxy[0].tolist()],
        })
    detections.sort(key=lambda d: d["confidence"], reverse=True)
    return detections