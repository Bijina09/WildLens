# 🦁 WildLens

**AI-Powered Wildlife Detection and Endangered Species Identification for Nepal's Camera Trap Images**

WildLens is a browser-based, role-based web application that analyses camera-trap images. A two-stage AI pipeline first filters out blank images (leaves, shadows, wind triggers) and then identifies five Nepal-specific endangered species. Results, history and model versions are stored in a Flask + SQLite backend, with a separate admin area for user management, training-data review and model management.

Semester project, BIT Semester VI, Kantipur City College.

---

## 🎯 Target Species

| Species | Conservation Status |
|---|---|
| Bengal Tiger | Endangered |
| One-horned Rhinoceros | Vulnerable |
| Snow Leopard | Vulnerable |
| Red Panda | Endangered |
| Asian Elephant | Endangered |

---

## 🔄 Two-Stage Pipeline

```
Uploaded image
      │
      ▼
Stage 1: ResNet18 classifier (wildlife vs blank)
      │
      ├── blank ─────────────► "No wildlife detected"
      │
      ▼ wildlife
Stage 2: YOLOv8m detector (5 target species)
      │
      ├── confidence ≥ threshold ─► species + confidence + bounding box
      └── confidence < threshold ─► "unidentified" (best guess shown)
```

The species confidence threshold is `SPECIES_THRESHOLD` in `services/pipeline.py` (currently 0.40, tuned on a small unseen set).

---

## ✨ Features

**Users**
- Registration and login (passwords hashed; public signup always creates a normal user)
- Single-image and batch upload (up to 30 images), with confidence scores
- Dashboard with totals, wildlife/blank counts and species breakdown
- Persistent prediction history (removing a record hides it from the user only)

**Admins** (created separately with `create_admin.py`, never via signup)
- View registered users, activate or deactivate accounts
- View all prediction records with the uploading user and the model version used
- Add images to a training-review queue, then approve (with corrected species) or reject
- Model management: list versions, mark validated, activate a version

---

## ⚙️ Tech Stack

| Layer | Tools |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Python, Flask, SQLite, Pillow |
| AI / ML | PyTorch (ResNet18), YOLOv8 (Ultralytics), OpenCV |
| Training | Google Colab, Roboflow |
| Tools | Git / GitHub, VS Code, Postman |

---

## 🚀 Quick Start (Windows / PowerShell)

```powershell
git clone https://github.com/Bijina09/WildLens.git
cd WildLens

python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

python create_admin.py      # creates the database (first run) and an admin account
python app.py
```

Open **http://127.0.0.1:5000** (use the same host every time so the login cookie is sent).

Optional: set a secret key for sessions before running in any shared environment:

```powershell
$env:WILDLENS_SECRET = "a-long-random-string"
```

Model weights are loaded from `models/`. The database (`database/wildlens.db`), `uploads/` and `training_candidates/` are created locally and are not committed.

---

## 🗂️ Project Structure

```
app.py                  Flask app, /detect and /detect/batch
config.py               Settings
create_admin.py         Create an admin account (run once)
register_model.py       Register a new model version as a draft
requirements.txt
database/               db.py, schema.sql (users, model_versions, predictions, training_data)
routes/                 auth.py, history.py, admin.py
services/               inference.py (Stage 1), stage2.py (Stage 2), pipeline.py
models/                 Active weights used by the app
frontend/               HTML, CSS, JS pages (user + admin)
stage1_*, stage2*/      Archived weights and metadata for earlier versions
```

Files `stage2_v2/*.pt` are stored with Git LFS.

---

## 🔌 API Overview

| Endpoint | Method | Access | Purpose |
|---|---|---|---|
| `/api/register`, `/api/login`, `/api/logout`, `/api/me` | POST / GET | Public / user | Authentication |
| `/detect` | POST | User | Single-image prediction |
| `/detect/batch` | POST | User | Batch prediction |
| `/api/history`, `/api/history/<id>` | GET / DELETE | User | History (soft delete) |
| `/api/admin/stats`, `/users`, `/predictions` | GET | Admin | Overview, users, all records |
| `/api/admin/users/<id>/status` | PATCH | Admin | Activate / deactivate user |
| `/api/admin/predictions/<id>/candidate` | POST | Admin | Add image to training review |
| `/api/admin/training`, `/training/<id>` | GET / PATCH | Admin | Review candidate images |
| `/api/admin/models`, `/models/<id>/status` | GET / PATCH | Admin | Model versions |

Roles are enforced on the server for every protected route.

---

## 📊 Results

**Stage 1 (ResNet18, v2):** 99.42% accuracy on a held-out test set (2,221 of 2,234 correct).

**Stage 2 (YOLOv8m, v3), held-out test split of 422 images (split by observer):**

| | Precision | Recall | mAP@50 | mAP@50-95 |
|---|---:|---:|---:|---:|
| Overall | 0.935 | 0.902 | 0.954 | 0.723 |

| Species | mAP@50 |
|---|---:|
| Bengal Tiger | 0.921 |
| One-horned Rhinoceros | 0.948 |
| Red Panda | 0.933 |
| Snow Leopard | 0.990 (only 14 instances) |
| Asian Elephant | 0.977 |

**Unseen-image check** (6 images per species, plus non-target animals): rhino 6/6, tiger 6/6, red panda 6/6, snow leopard 5/6, elephant 1/6 at threshold 0.40.

---

## 🧪 Model Development Log

**Stage 1 v1:** ResNet18 transfer learning. 99.96% validation accuracy but poor generalisation (4 of 5 real non-wildlife images misclassified), caused by a distribution mismatch between the wildlife and non-wildlife data sources.

**Stage 1 v2:** Rebuilt non-wildlife data with real camera-trap blanks (AMMonitor), corrected mislabelled images, proper 70/15/15 split, early stopping. 99.42% test accuracy.

**Stage 2 v1 (YOLOv8s):** Validation mAP@50 0.971 (P 0.944, R 0.948, mAP@50-95 0.790), but only 19 of 30 correct on unseen images, with rhino weakest.

**Stage 2 v2 (YOLOv8m):** 0 of 6 on unseen rhino images. Cause: all rhino training images from the source dataset were thermal.

**Stage 2 v3 (YOLOv8m, 50 epochs):** Replaced thermal rhino images with 303 RGB images (iNaturalist Nepal, split by observer), removed train/test overlaps, capped 500 images per class. Rhino on unseen images went from 0/6 to 6/6.

Archived weights and metadata for each version are in the repository.

---

## ⚠️ Known Limitations

- **Elephants are often misread as rhinos** (1 of 6 correct on the unseen set), most likely because of mud-coated skin texture. Not fixed.
- **Non-target animals are forced into the nearest class** (deer, lion and zebra were labelled as rhino or tiger with high confidence). The model has no "other animal" class.
- The species threshold was tuned on a small set (36 images) and should be re-tuned on a larger independent set.
- Snow leopard has few test instances, so its per-class score is not reliable.
- Multiple boxes can appear for one animal.
- Activating a model version in the admin panel records it as the active version, but the weights are still loaded once at startup from `models/`. Dynamic switching is planned.
- Approved training images keep the model's own bounding box, which must be checked in an annotation tool before retraining.

---

## 🛣️ Next Steps

- Load weights dynamically from the active model version
- Export approved training images into a YOLO-format dataset
- Add an "other animal" class to reduce forced misclassification
- Evaluate on a larger, more diverse independent camera-trap set
- Integration with Nepal's Human-Wildlife Conflict early-warning system

---

## 🧭 Development Process

The project follows the **Evolutionary Development** model in four cycles: foundation (data and Stage 1), species model (Stage 2 and API), integration (frontend, batch, auth) and finalisation (admin, testing, report). Evaluation results from each cycle drove changes to the datasets and models, as in the Stage 1 and Stage 2 histories above.

---

## 👥 Team

Bijina Khatri, Rinkesh Chaudhary, Shishir Ghimire

| Role | Responsibility |
|---|---|
| ML Engineer | Model training and evaluation, inference integration |
| Backend Developer | Backend and database |
| Frontend Developer | UI dashboard and integration |

---

## 📄 License

This project is for academic purposes, Kantipur City College, Semester VI.
