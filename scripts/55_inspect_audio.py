import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const Audio2" in line or "const Music" in line:
        print(f"L{i+1}: {line.strip()}")

for i in range(1840, 1920):
    if i < len(lines):
        if "sfx" in lines[i]:
            print(f"L{i+1}: {lines[i].strip()[:90]}")
