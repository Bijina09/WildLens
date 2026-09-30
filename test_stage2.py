import sys, os
from services.stage2 import identify_species

folder = sys.argv[1]
for f in sorted(os.listdir(folder)):
    if f.lower().endswith((".jpg", ".jpeg", ".png")):
        dets = identify_species(os.path.join(folder, f), conf=0.05)
        top = [(d["species"], round(d["confidence"], 2)) for d in dets[:2]]
        print(f, "->", top or "no detection")