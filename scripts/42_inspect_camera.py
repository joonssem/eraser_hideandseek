import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "camera.fov" in line or "camera.zoom" in line or "camera.position" in line or "tagger" in line.lower() or "seeker" in line.lower():
        if "updateCamera" in line or "camera" in line:
            print(f"L{i+1}: {line.strip()[:100]}")
