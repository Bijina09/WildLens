import torch

model_path = "models/stage1_v2_best_model.pth"

checkpoint = torch.load(model_path, map_location="cpu")

print("Checkpoint type:")
print(type(checkpoint))

if isinstance(checkpoint, dict):
    print("\nKeys found:")
    for key in checkpoint.keys():
        print("-", key)
else:
    print(checkpoint)