# 🦁 WildLens

**AI-Powered Wildlife Detection and Endangered Species Identification System**

WildLens is a web-based AI system that automatically processes camera trap images to detect wildlife presence and identify Nepal-specific endangered species. Built with a fine-tuned YOLOv8 deep learning model integrated into a Flask full-stack web application.

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

## 🏗️ Project Structure

```
wildlens/
├── frontend/               # HTML/CSS/JS frontend
│   ├── templates/          # Jinja2 HTML templates
│   └── static/
│       ├── css/            # Stylesheets
│       └── js/             # JavaScript files
│
├── backend/                # Flask REST API
│   ├── app.py              # Main Flask app & routes
│   ├── predictor.py        # YOLOv8 inference pipeline
│   └── database.py         # SQLite database operations
│
├── ml/                     # Machine learning
│   ├── notebooks/          # Colab/Kaggle training notebooks
│   ├── datasets/           # Dataset configs & splits (not raw images)
│   ├── models/weights/     # Trained .pt model files (gitignored)
│   └── scripts/            # Data prep & evaluation scripts
│
├── docs/                   # Documentation
├── tests/                  # API and unit tests
├── requirements.txt        # Python dependencies
└── .gitignore
```

---

## ⚙️ Tech Stack

**Frontend:** HTML5, CSS3, Vanilla JavaScript  
**Backend:** Python, Flask, SQLite, Pillow  
**AI/ML:** YOLOv8 (Ultralytics), OpenCV  
**Training:** Google Colab / Kaggle Notebooks  
**Tools:** Roboflow, Postman, Git

---

## 🔄 Two-Stage Detection Pipeline

```
Input Image
     │
     ▼
┌──────────────────────┐
│  Stage 1: Wildlife   │  ← YOLOv8 Model 1
│  Detection           │    (Wildlife vs. Blank)
└──────────────────────┘
     │
     ▼ Wildlife detected?
     │
     ▼
┌──────────────────────┐
│  Stage 2: Species    │  ← YOLOv8 Model 2
│  Classification      │    (5 Endangered Species)
└──────────────────────┘
     │
     ▼
Results + Confidence Score
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- pip

### Installation

```bash
# Clone the repository
git clone https://github.com/Bijina09/wildlens.git
cd wildlens

# Install dependencies
pip install -r requirements.txt

# Run the Flask app
cd backend
python app.py
```

Visit `http://localhost:5000` in your browser.

> **Note:** Without trained model weights, the app runs in **dummy mode** — returning mock predictions so the frontend and API can be developed and tested independently.

---

## 📊 Dataset Sources

- [iWildCam (LILA Science)](https://lila.science/datasets/iwildcam-wilds/)
- [iNaturalist](https://www.inaturalist.org/)
- [Roboflow Universe](https://universe.roboflow.com/)

---

## 👥 Team

| Role | Responsibility |
|---|---|
| ML Engineer | YOLOv8 model training & fine-tuning |
| Backend Developer | Flask REST API & database |
| Frontend Developer | UI dashboard & integration |

---

## 📅 Development Milestones

| Milestone | Week | Marks |
|---|---|---|
| Title Presentation | Week 4 | 10 |
| Mid-term Presentation | Week 9 | 15 |
| Pre-final Submission | Week 15 | 35 |

---

## 📄 License

This project is for academic purposes — Kantipur City College, Semester VI.
