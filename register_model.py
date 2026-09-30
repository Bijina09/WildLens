import os, sqlite3
from database.db import DB_PATH

name = input("Version name (e.g. v4): ").strip()
s1 = input("Stage 1 path (e.g. models/x.pth): ").strip()
s2 = input("Stage 2 path (e.g. models/stage2_v4_best.pt): ").strip()
ds = input("Dataset version label: ").strip()
num = lambda t: (lambda v: float(v) if v else None)(input(t + " (blank if unknown): ").strip())

for p in (s1, s2):
    if not os.path.exists(p):
        raise SystemExit("File not found: " + p)

con = sqlite3.connect(DB_PATH)
con.execute("""INSERT INTO model_versions (version_name, stage1_path, stage2_path, dataset_version,
    stage1_accuracy, precision_score, recall_score, map50, map50_95, status)
    VALUES (?,?,?,?,?,?,?,?,?, 'draft')""",
    (name, s1, s2, ds, num("Stage 1 accuracy (0-1)"), num("Precision"), num("Recall"),
     num("mAP50"), num("mAP50-95")))
con.commit()
print("Registered as draft. Validate and activate it from the admin Models page.")