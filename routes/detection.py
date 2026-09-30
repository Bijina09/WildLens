from flask import Blueprint, jsonify, request
from models.detection import db, Detection

detection_bp = Blueprint("detection", __name__)


@detection_bp.route("/history/detect", methods=["POST"])
def detect_animal():

    data = request.json

    image_name = data.get("image_name")

    if not image_name:
        return jsonify({
            "error": "image_name is required"
        }), 400

    animal = "Tiger"
    confidence = 95.5

    detection = Detection(
        animal_name=animal,
        confidence=confidence,
        image_name=image_name,
        location="Unknown"
    )

    db.session.add(detection)
    db.session.commit()

    return jsonify({
        "message": "Detection completed",
        "animal": animal,
        "confidence": confidence
    })