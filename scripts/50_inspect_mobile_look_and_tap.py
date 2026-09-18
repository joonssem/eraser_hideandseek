import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("=== Lines 3470 - 3550: Pointerdown, pointermove, pointerup for mobile ===")
for i in range(3470, 3555):
    if i < len(lines):
        print(f"{i+1}: {lines[i]}", end="")
