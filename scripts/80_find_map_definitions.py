# -*- coding: utf-8 -*-
import re

with open("index.html", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# Search for maps definition or select options
matches = re.findall(r"(build\w+|loadMap\w*|maps?\s*[:=]\s*\{[^}]+\}|<select[^>]*id=[\"']map[\"'][^>]*>.*?</select>)", text, re.DOTALL | re.IGNORECASE)
for m in matches[:10]:
    print("Match:", m[:200])
    print("-" * 40)

# Also search for "care" or any korean room names
korean_matches = re.findall(r"([가-힣\w\s]{0,20}(?:교실|돌봄|유치원|어린이집|기차|열차|레일)[가-힣\w\s]{0,20})", text)
print("Korean matches sample:", list(set(korean_matches))[:20])
