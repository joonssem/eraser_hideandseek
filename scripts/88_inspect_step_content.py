# -*- coding: utf-8 -*-
import sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

steps = [28, 74, 108, 145]
for s in steps:
    p = rf"C:\Users\PC\.gemini\antigravity-cli\brain\eb663f5c-6ae3-4831-ad8c-09853cfe35a6\.system_generated\steps\{s}\content.md"
    try:
        with open(p, "r", encoding="utf-8", errors="ignore") as f:
            print(f"=== STEP {s} ===")
            lines = f.readlines()
            for l in lines:
                if any(k in l for k in ["기차", "돌봄", "train", "care"]):
                    print(l.strip()[:150])
    except Exception as e:
        print(f"Error {s}: {e}")
