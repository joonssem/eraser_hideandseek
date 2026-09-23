# -*- coding: utf-8 -*-
with open("index.html", "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()

keywords = ["기차", "train", "돌봄", "care", "rail", "track", "locomotive"]

matches = []
for i, line in enumerate(lines):
    lower = line.lower()
    for kw in keywords:
        if kw in lower:
            matches.append((i + 1, kw, line.strip()[:120]))
            break

print(f"Total matching lines: {len(matches)}")
for line_no, kw, snippet in matches[:40]:
    print(f"L{line_no} [{kw}]: {snippet}")
