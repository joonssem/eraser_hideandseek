import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("=== Searching pencil and judge functions ===")
for i, line in enumerate(lines):
    if any(w in line for w in ["tryJudge", "judge", "pencil", "Pencil", "judgeRay", "judgeCenter", "shoot", "isJudgeBlocked"]):
        if i < 3300 or i > 3100:
            print(f"L{i+1}: {line.strip()[:110]}")

