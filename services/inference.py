"""
WildLens - Stage 1 v2
Example inference code for Flask/backend integration.

Expected output:
    class: "non_wildlife" or "wildlife"
    confidence: probability of the predicted class
"""

import cv2
import numpy as np
import torch

from services.model import load_model, CLASS_NAMES

MODEL_PATH = "models/stage1_v2_best_model.pth"

IMG_SIZE = 224
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

model, DEVICE = load_model(MODEL_PATH)


def preprocess_image(image_path):
    img = cv2.imread(image_path)

    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    # OpenCV loads BGR; training/inference expects RGB.
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Same evaluation/inference resize.
    img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))

    # Same scaling as torchvision ToTensor().
    img = img.astype(np.float32) / 255.0

    # ImageNet normalization.
    img = (img - MEAN) / STD

    # HWC -> CHW, then add batch dimension.
    img = np.transpose(img, (2, 0, 1))
    tensor = torch.tensor(img, dtype=torch.float32).unsqueeze(0)

    return tensor


def predict(image_path):
    input_tensor = preprocess_image(image_path).to(DEVICE)

    with torch.no_grad():
        output = model(input_tensor)
        probabilities = torch.softmax(output, dim=1)

        confidence, predicted_index = torch.max(probabilities, dim=1)

    predicted_class = CLASS_NAMES[predicted_index.item()]

    return {
        "class": predicted_class,
        "confidence": float(confidence.item())
    }


if __name__ == "__main__":
    # Change this path to test a local image.
    IMAGE_PATH = "test_image.jpg"

    result = predict(IMAGE_PATH)

    print("Prediction:", result["class"])
    print("Confidence:", f"{result['confidence'] * 100:.2f}%")
