import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("=== Lines 4140 - 4190: tagFound ===")
for i in range(4140, 4195):
    if i < len(lines):
        print(f"{i+1}: {lines[i]}", end="")

print("\n=== Lines 4705 - 4735: onSomeoneFound ===")
for i in range(4705, 4740):
    if i < len(lines):
        print(f"{i+1}: {lines[i]}", end="")
