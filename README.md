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

The species confidence threshold is `SPECIES_THRESHOLD` in `services/pipeline.py` (currently 0.40, chosen from a threshold sweep on 30 unseen target images and 68 non-target animals).

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
- Model management: list versions, mark validated, activate a version (the app loads the active Stage 2 model from the database, no restart needed)

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

**Stage 2 (YOLOv8m, v4, active model), held-out test split of 442 images / 598 instances (split by observer):**

| | Precision | Recall | mAP@50 | mAP@50-95 |
|---|---:|---:|---:|---:|
| Overall | 0.931 | 0.907 | 0.952 | 0.736 |

| Species | Images | Instances | Precision | Recall | mAP@50 | mAP@50-95 |
|---|---:|---:|---:|---:|---:|---:|
| Bengal Tiger | 205 | 262 | 0.949 | 0.848 | 0.929 | 0.627 |
| One-horned Rhinoceros | 30 | 37 | 0.892 | 0.893 | 0.953 | 0.819 |
| Red Panda | 76 | 86 | 0.915 | 0.907 | 0.935 | 0.731 |
| Snow Leopard | 14 | 14 | 0.957 | 1.000 | 0.995 | 0.722 |
| Asian Elephant | 117 | 199 | 0.941 | 0.884 | 0.951 | 0.780 |

Validation split (633 images, 870 instances): P 0.974, R 0.900, mAP@50 0.964, mAP@50-95 0.739.

**Unseen-image check** (6 images per species, threshold 0.40): **v4 29/30** correct (v3: 24/30).

| Species | v3 | v4 |
|---|---:|---:|
| Bengal Tiger | 6/6 | 6/6 |
| One-horned Rhinoceros | 6/6 | 6/6 |
| Red Panda | 6/6 | 6/6 |
| Asian Elephant | 1/6 | 6/6 |
| Snow Leopard | 5/6 | 5/6 |

The one v4 miss is a snow leopard on rocky terrain called rhino at confidence 0.29.

**Daytime elephant holdout** (20 colour iNaturalist images, split by observer, never trained on): v3 predicted rhino for 18 of 20; v4 predicted elephant for 19 of 20 (v4 elephant mAP@50 0.952).

---

## 🧪 Model Development Log

**Stage 1 v1:** ResNet18 transfer learning. 99.96% validation accuracy but poor generalisation (4 of 5 real non-wildlife images misclassified), caused by a distribution mismatch between the wildlife and non-wildlife data sources.

**Stage 1 v2:** Rebuilt non-wildlife data with real camera-trap blanks (AMMonitor), corrected mislabelled images, proper 70/15/15 split, early stopping. 99.42% test accuracy.

**Stage 2 v1 (YOLOv8s):** Validation mAP@50 0.971 (P 0.944, R 0.948, mAP@50-95 0.790), but only 19 of 30 correct on unseen images, with rhino weakest.

**Stage 2 v2 (YOLOv8m):** 0 of 6 on unseen rhino images. Cause: all rhino training images from the source dataset were thermal.

**Stage 2 v3 (YOLOv8m, 50 epochs):** Replaced thermal rhino images with 303 RGB images (iNaturalist Nepal, split by observer), removed train/test overlaps, capped 500 images per class. Rhino on unseen images went from 0/6 to 6/6. Test split (422 images): P 0.935, R 0.902, mAP@50 0.954, mAP@50-95 0.723. However, elephant dropped to 1/6 on the unseen set.

**Stage 2 v4 (YOLOv8m, 50 epochs):** Diagnosed the elephant/rhino confusion as a colour shortcut: about 78% of the old elephant training images were grayscale (485 of 622) while the rhino images were all colour, so v3 labelled 116 of 120 daytime elephant photos as rhino. Fixes:
- trimmed grayscale elephants to 200 (evenly spaced)
- added 120 daytime colour elephants (iNaturalist Nepal, research grade, split by observer)
- added grayscale copies of 40% of rhino training images so colour no longer separates the two classes

Result: elephant on unseen images went from 1/6 to 6/6, overall unseen accuracy from 24/30 to 29/30, and test mAP@50 stays at 0.952. v4 is the active model.

Archived weights and metadata for each version are in the repository.

---

## ⚠️ Known Limitations

- **Non-target animals are forced into the nearest class.** On 68 non-target animals (49 species), v4 named 47 as a target species at confidence ≥ 0.5 and 35 at ≥ 0.7. Buffalo, gaur, yak, cattle and deer were often called rhino or elephant at 0.85-0.95, and a leopard was called snow leopard (0.84). Raising the threshold alone does not fix this without hurting target species. The model has no "other animal" class.
- Snow leopard on rocky terrain can be misread as rhino at low confidence, and a dusk image of two overlapping snow leopards was missed by every model version.
- The species threshold was tuned on a small set (30 target + 68 non-target images) and should be re-tuned on a larger independent set.
- Snow leopard has few test instances (14), so its per-class score is not reliable.
- Multiple boxes can appear for one animal.
- Approved training images keep the model's own bounding box, which must be checked in an annotation tool before retraining.

---

## 🛣️ Next Steps

- Train v5 with an "other animal" class (about 400-500 training boxes from observers separate from the 68 test images), then recheck the unseen 30, the daytime elephant holdout and the 68 non-target animals
- Export approved training images into a YOLO-format dataset
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

My contribution: model training and evaluation, inference integration.

---

## 📄 License

This project is for academic purposes, Kantipur City College, Semester VI.
