import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("=== Lines 2850 - 2940 ===")
for i in range(2850, 2940):
    print(f"{i+1}: {lines[i]}", end="")
