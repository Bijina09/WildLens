import sqlite3
import threading

from ultralytics import YOLO
from database.db import DB_PATH

FALLBACK_PATH = "models/stage2_v4_best.pt"   # used only if the database lookup fails

_lock = threading.Lock()
_cache = {"path": None, "model": None}


def _active_path():
    """Stage 2 weights path of the model currently marked active in model_versions."""
    try:
        con = sqlite3.connect(DB_PATH)
        row = con.execute(
            "SELECT stage2_path FROM model_versions WHERE status='active' "
            "ORDER BY model_id DESC LIMIT 1"
        ).fetchone()
        con.close()
        return row[0] if row and row[0] else FALLBACK_PATH
    except Exception:
        return FALLBACK_PATH


def get_model():
    """Return the YOLO model for the active version, reloading only when the admin switches versions."""
    path = _active_path()
    with _lock:
        if _cache["path"] != path:
            _cache["model"] = YOLO(path)
            _cache["path"] = path
        return _cache["model"]


def identify_species(image_path, conf=0.25):
    model = get_model()
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