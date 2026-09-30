import re
from functools import wraps
from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from database.db import get_db

auth_bp = Blueprint("auth", __name__)
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def login_required(f):
    @wraps(f)
    def wrapper(*a, **kw):
        uid = session.get("user_id")
        if not uid:
            return jsonify(error="Please log in first"), 401
        row = get_db().execute("SELECT status, role FROM users WHERE user_id=?", (uid,)).fetchone()
        if not row or row["status"] != "active":
            session.clear()
            return jsonify(error="Account deactivated or not found"), 401
        session["role"] = row["role"]      # role always comes from the database
        return f(*a, **kw)
    return wrapper

def admin_required(f):
    @wraps(f)
    def wrapper(*a, **kw):
        if session.get("role") != "admin":
            return jsonify(error="Admin access required"), 403
        return f(*a, **kw)
    return wrapper

def public_user(row):
    return {"name": row["name"], "email": row["email"], "role": row["role"]}

@auth_bp.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not EMAIL_RE.match(email):
        return jsonify(error="Enter a valid name and email"), 400
    if len(password) < 6:
        return jsonify(error="Password must be at least 6 characters"), 400

    db = get_db()
    if db.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
        return jsonify(error="An account with this email already exists"), 409

    # role is NEVER read from the request: public signup always creates a user
    db.execute("INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?, 'user')",
               (name, email, generate_password_hash(password)))
    db.commit()
    return jsonify(message="Registration successful"), 201

@auth_bp.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    db = get_db()
    row = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not row or not check_password_hash(row["password_hash"], password):
        return jsonify(error="Invalid email or password"), 401
    if row["status"] != "active":
        return jsonify(error="Your account has been deactivated. Contact an admin."), 403

    session.clear()
    session["user_id"] = row["user_id"]
    session["role"] = row["role"]
    db.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?", (row["user_id"],))
    db.commit()
    return jsonify(message="Login successful", user=public_user(row))

@auth_bp.post("/api/logout")
def logout():
    session.clear()
    return jsonify(message="Logged out")

@auth_bp.get("/api/me")
@login_required
def me():
    row = get_db().execute("SELECT * FROM users WHERE user_id = ?", (session["user_id"],)).fetchone()
    if not row or row["status"] != "active":
        session.clear()
        return jsonify(error="Session expired"), 401
    return jsonify(user=public_user(row))