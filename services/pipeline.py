from services.inference import predict as stage1_predict
from services.stage2 import identify_species

SPECIES_THRESHOLD = 0.40   # tuned on the 36-image unseen set


def run_pipeline(image_path):
    s1 = stage1_predict(image_path)

    if s1["class"] != "wildlife":
        return {"label": "blank", "stage1_confidence": s1["confidence"],
                "species": None, "confidence": None,
                "bbox": None, "top_guess": None, "detections": []}

    dets = identify_species(image_path)
    top = dets[0] if dets else None

    # wildlife, but not confidently one of the five target species
    if top is None or top["confidence"] < SPECIES_THRESHOLD:
        return {"label": "unidentified", "stage1_confidence": s1["confidence"],
                "species": None,
                "confidence": top["confidence"] if top else None,
                "bbox": top["bbox"] if top else None,
                "top_guess": top["species"] if top else None,
                "detections": dets}

    return {"label": "wildlife", "stage1_confidence": s1["confidence"],
            "species": top["species"], "confidence": top["confidence"],
            "bbox": top["bbox"], "top_guess": None, "detections": dets}