import os
import shutil
from flask import Blueprint, jsonify, request, session
from database.db import get_db
from routes.auth import login_required, admin_required

admin_bp = Blueprint("admin", __name__)

@admin_bp.get("/api/admin/stats")
@login_required
@admin_required
def stats():
    db = get_db()
    one = lambda q: db.execute(q).fetchone()[0]
    labels = {r["final_label"]: r["n"] for r in db.execute(
        "SELECT final_label, COUNT(*) n FROM predictions GROUP BY final_label")}
    species = [dict(r) for r in db.execute(
        """SELECT species, COUNT(*) n FROM predictions
           WHERE final_label='wildlife' GROUP BY species ORDER BY n DESC""")]
    return jsonify(
        users=one("SELECT COUNT(*) FROM users WHERE role='user'"),
        active_users=one("SELECT COUNT(*) FROM users WHERE role='user' AND status='active'"),
        predictions=one("SELECT COUNT(*) FROM predictions"),
        wildlife=labels.get("wildlife", 0),
        unidentified=labels.get("unidentified", 0),
        blank=labels.get("blank", 0),
        avg_ms=one("SELECT COALESCE(ROUND(AVG(processing_time_ms)),0) FROM predictions"),
        species=species,
    )

@admin_bp.get("/api/admin/users")
@login_required
@admin_required
def list_users():
    rows = get_db().execute(
        """SELECT u.user_id, u.name, u.email, u.role, u.status, u.created_at, u.last_login,
                  (SELECT COUNT(*) FROM predictions p WHERE p.user_id = u.user_id) AS scans
           FROM users u ORDER BY u.user_id""").fetchall()
    return jsonify(users=[dict(r) for r in rows])

@admin_bp.patch("/api/admin/users/<int:uid>/status")
@login_required
@admin_required
def set_status(uid):
    status = (request.get_json(silent=True) or {}).get("status")
    if status not in ("active", "inactive"):
        return jsonify(error="Invalid status"), 400
    if uid == session["user_id"]:
        return jsonify(error="You cannot deactivate your own account"), 400

    db = get_db()
    target = db.execute("SELECT role FROM users WHERE user_id=?", (uid,)).fetchone()
    if not target:
        return jsonify(error="User not found"), 404
    if target["role"] == "admin":
        return jsonify(error="Admin accounts are managed separately"), 403

    db.execute("UPDATE users SET status=? WHERE user_id=?", (status, uid))
    db.commit()
    return jsonify(message="User " + ("activated" if status == "active" else "deactivated"))

@admin_bp.get("/api/admin/predictions")
@login_required
@admin_required
def list_predictions():
    label = request.args.get("label")
    user_id = request.args.get("user_id", type=int)
    limit = min(request.args.get("limit", 50, type=int), 200)
    offset = request.args.get("offset", 0, type=int)

    where, args = [], []
    if label in ("wildlife", "unidentified", "blank"):
        where.append("p.final_label = ?"); args.append(label)
    if user_id:
        where.append("p.user_id = ?"); args.append(user_id)
    clause = ("WHERE " + " AND ".join(where)) if where else ""

    db = get_db()
    total = db.execute(f"SELECT COUNT(*) FROM predictions p {clause}", args).fetchone()[0]
    rows = db.execute(
        f"""SELECT p.prediction_id, p.original_filename, p.final_label, p.species,
                   p.stage1_confidence, p.stage2_confidence, p.processing_time_ms,
                   p.batch_id, p.created_at, p.deleted_at, (SELECT t.review_status FROM training_data t
                    WHERE t.prediction_id = p.prediction_id) AS training_status,
                   u.name AS user_name, u.email AS user_email, m.version_name AS model_version
            FROM predictions p
            JOIN users u ON u.user_id = p.user_id
            JOIN model_versions m ON m.model_id = p.model_id
            {clause}
            ORDER BY p.prediction_id DESC LIMIT ? OFFSET ?""",
        args + [limit, offset]).fetchall()

    items = []
    for r in rows:
        d = dict(r)
        d["image"] = f"/api/image/{d['prediction_id']}"
        d["removed_by_user"] = d.pop("deleted_at") is not None
        items.append(d)
    return jsonify(total=total, items=items)

@admin_bp.get("/api/admin/models")
@login_required
@admin_required
def list_models():
    rows = get_db().execute("SELECT * FROM model_versions ORDER BY model_id DESC").fetchall()
    return jsonify(models=[dict(r) for r in rows])

CANDIDATE_DIR = "training_candidates"
LABELS = ["Bengal Tiger", "One-horned Rhinoceros", "Snow Leopard",
          "Red Panda", "Asian Elephant", "Other / not a target species"]

@admin_bp.post("/api/admin/predictions/<int:pid>/candidate")
@login_required
@admin_required
def make_candidate(pid):
    db = get_db()
    p = db.execute("SELECT * FROM predictions WHERE prediction_id=?", (pid,)).fetchone()
    if not p:
        return jsonify(error="Not found"), 404
    if db.execute("SELECT 1 FROM training_data WHERE prediction_id=?", (pid,)).fetchone():
        return jsonify(error="Already added to training review"), 409
    if not os.path.exists(p["image_path"]):
        return jsonify(error="Image file is missing on the server"), 404

    os.makedirs(CANDIDATE_DIR, exist_ok=True)
    dest = os.path.join(CANDIDATE_DIR, os.path.basename(p["image_path"]))
    shutil.copy2(p["image_path"], dest)     # a copy, independent of the user's history
    db.execute("""INSERT INTO training_data (prediction_id, image_path, predicted_species, bbox)
                  VALUES (?,?,?,?)""", (pid, dest, p["species"], p["bbox"]))
    db.commit()
    return jsonify(message="Added to training review")

@admin_bp.get("/api/admin/training")
@login_required
@admin_required
def list_training():
    status = request.args.get("status")
    db = get_db()
    where, args = "", []
    if status in ("pending", "approved", "rejected"):
        where, args = "WHERE t.review_status = ?", [status]
    rows = db.execute(f"""
        SELECT t.training_data_id AS id, t.predicted_species, t.actual_species,
               t.review_status, t.created_at, u.name AS user_name
        FROM training_data t
        JOIN predictions p ON p.prediction_id = t.prediction_id
        JOIN users u ON u.user_id = p.user_id
        {where} ORDER BY t.training_data_id DESC""", args).fetchall()
    counts = {"pending": 0, "approved": 0, "rejected": 0}
    for r in db.execute("SELECT review_status, COUNT(*) n FROM training_data GROUP BY review_status"):
        counts[r["review_status"]] = r["n"]
    items = []
    for r in rows:
        d = dict(r)
        d["image"] = f"/api/admin/training/{d['id']}/image"
        items.append(d)
    return jsonify(items=items, counts=counts, labels=LABELS)

@admin_bp.patch("/api/admin/training/<int:tid>")
@login_required
@admin_required
def review_training(tid):
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    label = data.get("actual_species")
    if status not in ("approved", "rejected"):
        return jsonify(error="Invalid status"), 400
    if status == "approved" and label not in LABELS:
        return jsonify(error="Choose the correct species before approving"), 400

    db = get_db()
    cur = db.execute("""UPDATE training_data
        SET review_status=?, actual_species=?, reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP
        WHERE training_data_id=?""",
        (status, label if status == "approved" else None, session["user_id"], tid))
    db.commit()
    if cur.rowcount == 0:
        return jsonify(error="Not found"), 404
    return jsonify(message="Approved" if status == "approved" else "Rejected")

@admin_bp.get("/api/admin/training/<int:tid>/image")
@login_required
@admin_required
def training_image(tid):
    from flask import send_file
    row = get_db().execute("SELECT image_path FROM training_data WHERE training_data_id=?",
                           (tid,)).fetchone()
    if not row or not os.path.exists(row["image_path"]):
        return jsonify(error="Not found"), 404
    return send_file(os.path.abspath(row["image_path"]))

@admin_bp.patch("/api/admin/models/<int:mid>/status")
@login_required
@admin_required
def set_model_status(mid):
    to = (request.get_json(silent=True) or {}).get("status")
    db = get_db()
    m = db.execute("SELECT * FROM model_versions WHERE model_id=?", (mid,)).fetchone()
    if not m:
        return jsonify(error="Not found"), 404

    if to == "validated" and m["status"] == "draft":
        db.execute("UPDATE model_versions SET status='validated' WHERE model_id=?", (mid,))
        db.commit()
        return jsonify(message="Marked as validated")

    if to == "active" and m["status"] in ("validated", "archived"):
        for path in (m["stage1_path"], m["stage2_path"]):
            if not os.path.exists(path):
                return jsonify(error=f"Model file not found: {path}"), 400
        db.execute("UPDATE model_versions SET status='archived' WHERE status='active'")
        db.execute("""UPDATE model_versions SET status='active',
                      activated_at=CURRENT_TIMESTAMP, activated_by=? WHERE model_id=?""",
                   (session["user_id"], mid))
        db.commit()
        return jsonify(message=f"{m['version_name']} is now the active model")

    return jsonify(error=f"Cannot change {m['status']} to {to}"), 400