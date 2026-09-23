# -*- coding: utf-8 -*-
import os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

dirs = [r"C:\Users\PC\Desktop", r"C:\Users\PC\Downloads", r"D:\Projects\eraser_hideandseek"]

for d in dirs:
    if not os.path.exists(d): continue
    print(f"--- Checking {d} ---")
    for f in os.listdir(d):
        if any(k in f.lower() for k in ["돌봄", "기차", "train", "care", "eraser", "index"]):
            print(f"File: {f}")
