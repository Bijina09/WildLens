import os
import uuid

from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
from werkzeug.utils import secure_filename

from services.pipeline import run_pipeline
from database.db import close_db, init_db, DB_PATH
from routes.auth import auth_bp, login_required
import time
from routes.history import history_bp, save_prediction
from routes.admin import admin_bp

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

# static_url_path="" serves frontend/login.html at /login.html, etc.
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)

# these need `app` to exist, so they come after it is created
app.secret_key = os.environ.get("WILDLENS_SECRET", "dev-only-change-me")
app.teardown_appcontext(close_db)
app.register_blueprint(auth_bp)
app.register_blueprint(history_bp)   
app.register_blueprint(admin_bp)

if not os.path.exists(DB_PATH):
    init_db()


@app.route("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/api/health")
def health():
    return {"project": "Wild Lens AI", "backend": "Running"}


MAX_BATCH = 30

def process_one(image, batch_id=None):
    os.makedirs("uploads", exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}_{secure_filename(image.filename)}"
    image_path = os.path.join("uploads", safe_name)
    image.save(image_path)

    start = time.time()
    result = run_pipeline(image_path)
    if result is None:
        raise RuntimeError("run_pipeline returned nothing")
    ms = int((time.time() - start) * 1000)

    result["filename"] = image.filename
    result["prediction_id"] = save_prediction(session["user_id"], image.filename,
                                              image_path, result, ms, batch_id)
    return result


@app.route("/detect", methods=["POST"])
@login_required
def detect():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    return jsonify(process_one(request.files["image"]))


@app.route("/detect/batch", methods=["POST"])
@login_required
def detect_batch():
    files = request.files.getlist("images")
    if not files:
        return jsonify({"error": "No images uploaded"}), 400
    if len(files) > MAX_BATCH:
        return jsonify({"error": f"Maximum {MAX_BATCH} images per batch"}), 400

    batch_id = uuid.uuid4().hex
    results = []
    for f in files:
        if not f.filename or not (f.mimetype or "").startswith("image/"):
            results.append({"filename": f.filename or "unknown", "error": "Not an image"})
            continue
        try:
            results.append(process_one(f, batch_id))
        except Exception as e:
            app.logger.exception("Batch item failed")
            results.append({"filename": f.filename, "error": "Processing failed"})

    return jsonify(batch_id=batch_id, results=results)


if __name__ == "__main__":
    app.run(debug=True)