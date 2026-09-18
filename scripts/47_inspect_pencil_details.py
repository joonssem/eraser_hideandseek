import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("=== Lines 2420 - 2445: pencilFP definition ===")
for i in range(2420, 2446):
    print(f"{i+1}: {lines[i]}", end="")

print("\n=== Lines 3175 - 3280: tryJudge and updatePencil ===")
for i in range(3175, 3280):
    print(f"{i+1}: {lines[i]}", end="")
