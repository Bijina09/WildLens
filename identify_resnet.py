import torch
import torchvision.models as models

checkpoint = torch.load("models/stage1_v2_best_model.pth", map_location="cpu")

models_to_try = [
    ("ResNet18", models.resnet18),
    ("ResNet34", models.resnet34),
    ("ResNet50", models.resnet50),
    ("ResNet101", models.resnet101),
]

for name, model_fn in models_to_try:
    try:
        model = model_fn(weights=None)
        model.load_state_dict(checkpoint)
        print(f"✅ SUCCESS: {name}")
        break
    except Exception:
        print(f"❌ Not {name}")