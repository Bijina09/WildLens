"""
WildLens - Stage 1 v2
Model definition for Flask/backend inference.

Task:
    Binary classification: non_wildlife vs wildlife

Architecture:
    ResNet18 pretrained on ImageNet during training.
    All pretrained layers were frozen except layer4.
    The original FC layer was replaced with a 2-class linear head.

Important:
    The provided .pth file contains the model state_dict, not the full model.
"""

import torch
import torch.nn as nn
from torchvision import models

CLASS_NAMES = ["non_wildlife", "wildlife"]


def create_model():
    model = models.resnet18(weights=None)

    # Same classification head used during training.
    num_features = model.fc.in_features
    model.fc = nn.Linear(num_features, len(CLASS_NAMES))

    return model


def load_model(model_path, device=None):
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model = create_model()

    state_dict = torch.load(
        model_path,
        map_location=device,
        weights_only=True
    )
    model.load_state_dict(state_dict)

    model = model.to(device)
    model.eval()

    return model, device
