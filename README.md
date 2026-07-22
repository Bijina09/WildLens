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

## 👥 Team

| Role | Responsibility |
|---|---|
| ML Engineer | YOLOv8 model fine-tuning & Flask REST API|
| Backend Developer | Backend & database |
| Frontend Developer | UI dashboard & integration |

---

## 📄 License

This project is for academic purposes — Kantipur City College, Semester VI.


## Progress Log

### Stage 1 - v1 (current)
- ResNet18 transfer learning, binary classification (wildlife vs non_wildlife)
- Validation accuracy: 99.96%
- Known issue: Testing on unfamiliar images revealed poor generalization (4/5 real non-wildlife images misclassified as wildlife). Likely caused by a distribution mismatch between wildlife and non_wildlife dataset sources.
- See stage1_v1_metadata.json for full training details.
- Next step: Diversify non_wildlife data sources, retrain as v2.


### Stage 1 - v2
- Rebuilt non_wildlife data with diverse real camera-trap sources (AMMonitor), corrected mislabeled null images, proper 3-way train/val/test split, early stopping
- Test accuracy: 99.42% (2221/2234 correct) - honest held-out metric, not just validation
- External sanity test (10 unfamiliar images): improved from 6/10 (v1) to 8/10 correct; non_wildlife recall improved from 20% to 60%
- See stage1_v2_metadata.json for full details
- Still 2/10 misclassified on sanity test - next step is further investigation and diversification for v3
