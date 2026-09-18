import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "tryJudge" in line or "btnJudge" in line or "seekerControls" in line:
        print(f"L{i+1}: {line.strip()}")

