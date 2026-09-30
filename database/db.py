import sqlite3, os
from flask import g

BASE_DIR = os.path.dirname(os.path.abspath(__file__))          # .../WildLens/database
DB_PATH = os.path.join(BASE_DIR, "wildlens.db")
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db

def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()

def init_db():
    con = sqlite3.connect(DB_PATH)
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        con.executescript(f.read())
    con.execute("""INSERT OR IGNORE INTO model_versions
        (version_name, stage1_path, stage2_path, dataset_version, stage1_accuracy,
         precision_score, recall_score, map50, map50_95, status)
        VALUES ('v3', 'models/your_stage1_name.pth', 'models/your_stage2_name.pt', 'v3',
                0.9942, 0.935, 0.902, 0.954, 0.723, 'active')""")
    con.commit()
    con.close()