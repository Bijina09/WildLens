import os, json
from flask import Blueprint, jsonify, request, session, send_file
from database.db import get_db
from routes.auth import login_required

history_bp = Blueprint("history", __name__)

def display_species(row):
    if row["final_label"] == "wildlife":
        return row["species"]
    if row["final_label"] == "unidentified":
        return "Wildlife detected (not a target species)"
    return "No wildlife detected"

def display_conf(row):
    c = row["stage2_confidence"] if row["final_label"] == "wildlife" else row["stage1_confidence"]
    return round((c or 0) * 100, 1)

def to_item(row):
    return {
        "id": row["prediction_id"],
        "label": row["final_label"],
        "species": display_species(row),
        "confidence": display_conf(row),
        "date": row["created_at"].replace(" ", "T") + "Z",
        "image": f"/api/image/{row['prediction_id']}",
    }

def get_active_model_id(db):
    row = db.execute("""SELECT model_id FROM model_versions WHERE status='active'
                        ORDER BY activated_at DESC, model_id DESC LIMIT 1""").fetchone()
    return row["model_id"] if row else None

def save_prediction(user_id, original_filename, image_path, result, ms, batch_id=None):
    db = get_db()
    model_id = get_active_model_id(db)
    if model_id is None:
        raise RuntimeError("No active model row in model_versions")
    label = result.get("label", "blank")
    is_wild = label == "wildlife"
    cur = db.execute("""INSERT INTO predictions
        (user_id, model_id, batch_id, original_filename, image_path, final_label, stage1_label,
         stage1_confidence, species, stage2_confidence, bbox, processing_time_ms)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (user_id, model_id, batch_id, original_filename, image_path, label,
         "blank" if label == "blank" else "wildlife",
         result.get("stage1_confidence"),
         result.get("species") if is_wild else None,
         result.get("confidence") if is_wild else None,
         json.dumps(result["bbox"]) if result.get("bbox") is not None else None,
         ms))
    db.commit()
    return cur.lastrowid

@history_bp.get("/api/history")
@login_required
def history():
    rows = get_db().execute(
        """SELECT * FROM predictions
           WHERE user_id=? AND deleted_at IS NULL
           ORDER BY prediction_id DESC""",
        (session["user_id"],)).fetchall()
    return jsonify(items=[to_item(r) for r in rows])

@history_bp.delete("/api/history/<int:pid>")
@login_required
def delete_history(pid):
    db = get_db()
    cur = db.execute(
        """UPDATE predictions SET deleted_at = CURRENT_TIMESTAMP
           WHERE prediction_id=? AND user_id=? AND deleted_at IS NULL""",
        (pid, session["user_id"]))
    db.commit()
    if cur.rowcount == 0:
        return jsonify(error="Not found"), 404
    return jsonify(message="Removed from history")   # file and row are kept for admin

@history_bp.get("/api/image/<int:pid>")
@login_required
def image(pid):
    row = get_db().execute(
        "SELECT image_path, user_id, deleted_at FROM predictions WHERE prediction_id=?",
        (pid,)).fetchone()
    if not row:
        return jsonify(error="Not found"), 404
    is_admin = session.get("role") == "admin"
    if not is_admin and (row["user_id"] != session["user_id"] or row["deleted_at"]):
        return jsonify(error="Not found"), 404
    return send_file(os.path.abspath(row["image_path"]))