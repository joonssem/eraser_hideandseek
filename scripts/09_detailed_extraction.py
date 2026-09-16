import re
import json

HTML_PATH = r"D:/Projects/eraser_hideandseek/index (배포용).html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    text = f.read()
    lines = text.splitlines()

# 1. Inspect FIREBASE_SERVERS
fb_text = ""
for i, l in enumerate(lines):
    if "const FIREBASE_SERVERS" in l or "let FIREBASE_SERVERS" in l or "var FIREBASE_SERVERS" in l:
        fb_text = "\n".join(lines[i:i+35])
        break

# 2. Inspect Blackout gimmick
blackout_matches = []
for i, l in enumerate(lines):
    if "blackout" in l:
        blackout_matches.append(f"L{i+1}: {l.strip()}")

# 3. Inspect library book carts
library_matches = []
for i, l in enumerate(lines):
    if "updateBookCarts" in l or "cartCleanup" in l:
        library_matches.append(f"L{i+1}: {l.strip()}")

# 4. Inspect Poses & Movement
pose_matches = []
for i, l in enumerate(lines):
    if "G.pose" in l or "setPose" in l or "pose" in l and ("stand" in l or "lie" in l):
        pose_matches.append(f"L{i+1}: {l.strip()}")

# 5. Inspect Painting & Eyedropper
paint_matches = []
for i, l in enumerate(lines):
    if "trySample" in l or "samplePixel" in l or "spray" in l:
        paint_matches.append(f"L{i+1}: {l.strip()}")

# 6. Inspect Game settings
settings_matches = []
for i, l in enumerate(lines):
    if "DEFAULT_SETTINGS" in l or "defaultSettings" in l or "settings:" in l:
        settings_matches.append(f"L{i+1}: {l.strip()}")

data = {
    "firebase_servers": fb_text,
    "blackout": blackout_matches[:10],
    "library": library_matches[:10],
    "poses": pose_matches[:15],
    "paint_sample": paint_matches[:15],
    "settings": settings_matches[:10]
}

with open("D:/Projects/eraser_hideandseek/intermediate_results/deep_mechanics.json", "w", encoding="utf-8-sig") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Firebase servers snippet:\n", fb_text[:300])
print("\nBlackout matches count:", len(blackout_matches))
print("Library matches count:", len(library_matches))
