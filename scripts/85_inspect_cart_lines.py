# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open("index.html", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

lines = text.splitlines()
for i, line in enumerate(lines):
    if "cart" in line.lower() or "buildcart" in line.lower():
        print(f"L{i+1}: {line}")
