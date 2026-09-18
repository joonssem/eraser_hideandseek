import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "phaseEnd" in line or "updateHUD" in line:
        if i < 4600 and i > 4400:
            print(f"L{i+1}: {line.strip()[:100]}")
