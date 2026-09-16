HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "function isJudgeBlocked" in l or "isJudgeBlocked=" in l:
        print(f"--- isJudgeBlocked at L{i+1} ---")
        for j in range(max(0, i-5), min(i+40, len(lines))):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
