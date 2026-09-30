import sqlite3, getpass
from werkzeug.security import generate_password_hash
from database.db import DB_PATH, init_db
import os

if not os.path.exists(DB_PATH):
    init_db()

name = input("Admin name: ").strip()
email = input("Admin email: ").strip().lower()
pw = getpass.getpass("Password: ")

con = sqlite3.connect(DB_PATH)
con.execute("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?, 'admin')",
            (name, email, generate_password_hash(pw)))
con.commit()
print("Admin created.")