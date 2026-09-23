# -*- coding: utf-8 -*-
import os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

keywords = ["돌봄교실", "기차", "돌봄", "장난감 기차", "train", "care_room", "careroom"]
d_proj = r"D:\Projects"

for root, dirs, files in os.walk(d_proj):
    if ".git" in root or "node_modules" in root:
        continue
    for file in files:
        if file.endswith((".html", ".js", ".py", ".md", ".txt", ".json")):
            p = os.path.join(root, file)
            try:
                with open(p, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                for kw in keywords:
                    if kw in content:
                        print(f"[{kw}] in {p}")
                        break
            except Exception as e:
                pass
