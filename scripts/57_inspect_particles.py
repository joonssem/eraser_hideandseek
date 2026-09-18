import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "function burst(" in line or "const particles=" in line:
        print(f"L{i+1}: {line.strip()}")

for i in range(2480, 2520):
    if i < len(lines) and ("burst" in lines[i] or "particle" in lines[i].lower()):
        print(f"L{i+1}: {lines[i].strip()[:90]}")
