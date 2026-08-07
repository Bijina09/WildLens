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


### Stage 2 - v1

- YOLO-based object detection model for identifying the five target endangered wildlife species.
- Target classes:
  - Bengal Tiger
  - One-horned Rhinoceros
  - Red Panda
  - Snow Leopard
  - Asian Elephant
- Validation set: 732 images and 986 annotated instances
- Overall validation Precision: **94.4%**
- Overall validation Recall: **94.8%**
- Overall validation mAP@50: **97.1%**
- Overall validation mAP@50-95: **79.0%**

#### Per-Class Validation Performance

| Species | Precision | Recall | mAP@50 | mAP@50-95 |
| --- | ---: | ---: | ---: | ---: |
| Bengal Tiger | 93.9% | 93.5% | 96.8% | 69.0% |
| Rhinoceros | 93.8% | 98.3% | 99.2% | 92.9% |
| Red Panda | 93.3% | 95.0% | 96.7% | 74.6% |
| Snow Leopard | 96.5% | 97.9% | 97.3% | 81.1% |
| Elephant | 94.5% | 89.5% | 95.6% | 77.4% |

#### Unseen Image Testing

The model was additionally tested on **30 previously unseen images**, consisting of 6 images from each target species.

The images were supplied to the model from a single folder without class-specific folders, simulating the intended real-world usage where a user can upload an arbitrary wildlife image.

The initial unseen-image test showed:

- **Bengal Tiger:** strong performance; all 6 images produced Bengal Tiger detections.
- **Red Panda:** strong performance; all 6 images produced Red Panda detections.
- **Snow Leopard:** generally good performance, although some difficult images produced weak or no detections.
- **Elephant:** mixed performance; several images were correctly detected, while others were incorrectly detected as Bengal Tiger or Red Panda.
- **Rhinoceros:** the weakest generalization performance; several Rhino images were incorrectly detected as Bengal Tiger or Elephant, while some produced no detection.

#### Key Observation

Although the validation results are strong (**97.1% mAP@50**), testing on previously unseen images revealed a noticeable generalization gap.

This suggests that the model performs well on images similar to the training/validation distribution but requires further improvement for visually different real-world images.

The unseen-image results are therefore being treated as a **generalization check rather than a replacement for the formal validation metrics**.

#### Current Limitations

- Limited diversity of unseen images.
- Rhinoceros images showed particularly weak generalization.
- Some images produced no detections.
- Some images produced incorrect species detections.
- Multiple detections of the same animal can occur in a single image.
- Further testing with more geographically and visually diverse camera-trap images is required.

#### Next Steps

- Investigate Stage 2 misclassified and undetected unseen images.
- Add more diverse training examples, particularly for Rhinoceros.
- Evaluate performance on a larger independent test set.
- Analyze confusion between visually similar species.
- Integrate Stage 1 and Stage 2 into the Flask backend.
- Perform complete end-to-end testing of the WildLens pipeline.

### Current Two-Stage Progress

```text
Stage 1 - Wildlife Detection
        |
        | Wildlife / Non-Wildlife
        v
Stage 1 v2
        |
        | Wildlife detected
        v
Stage 2 - Species Identification
        |
        +-- Bengal Tiger
        +-- One-horned Rhinoceros
        +-- Red Panda
        +-- Snow Leopard
        +-- Asian Elephant
        |
        v
Species + Bounding Box + Confidence

Current status: Stage 1 v2 and Stage 2 v1 models have been trained and evaluated. Stage 2 has also undergone an initial unseen-image generalization test. Backend integration and further model improvement are currently in progress.
