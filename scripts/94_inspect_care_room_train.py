# -*- coding: utf-8 -*-
with open("maps/care_room.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if any(k in line.lower() for k in ["train", "기차", "track", "rail", "update", "loop"]):
        print(f"L{i+1}: {line.strip()[:100]}")
