from flask import Blueprint, request, jsonify
import os

upload_bp = Blueprint("upload", __name__)

UPLOAD_FOLDER = "uploads"

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


@upload_bp.route("/upload", methods=["POST"])
def upload_image():

    if "image" not in request.files:
        return jsonify({
            "error": "No image provided"
        }), 400

    image = request.files["image"]

    filepath = os.path.join(
        UPLOAD_FOLDER,
        image.filename
    )

    image.save(filepath)

    return jsonify({
        "message": "Image uploaded successfully",
        "filename": image.filename
    })