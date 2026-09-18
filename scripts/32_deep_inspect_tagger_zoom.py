import sys
import re

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# 1. Look around line 3300-3500 (Mobile UI and Joypad, zoom handling)
print("=== Lines 3280 - 3460: Input, Joypad, Mobile UI, Touch ===")
for idx in range(3280, 3460):
    if idx < len(lines):
        print(f"{idx+1}: {lines[idx]}", end="")

