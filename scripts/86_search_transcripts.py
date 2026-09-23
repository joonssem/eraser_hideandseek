# -*- coding: utf-8 -*-
import os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

app_data = r"C:\Users\PC\.gemini\antigravity-cli"
print("Scanning for other transcripts or projects...")

for root, dirs, files in os.walk(app_data):
    for f in files:
        if f.endswith(".jsonl") or f.endswith(".md"):
            p = os.path.join(root, f)
            try:
                with open(p, "r", encoding="utf-8", errors="ignore") as file:
                    txt = file.read()
                    if "기차" in txt or "돌봄" in txt or "train" in txt:
                        print(f"Found in {p}")
            except:
                pass
