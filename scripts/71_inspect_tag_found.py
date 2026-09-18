import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "async tagFound(" in line or "function onSomeoneFound(" in line:
        print(f"L{i+1}: {line.strip()}")

for i in range(4120, 4200):
    if i < len(lines) and ("tagFound" in lines[i] or "found" in lines[i]):
        print(f"L{i+1}: {lines[i].strip()[:90]}")
