HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "POSE_H" in l or "POSE_HALF" in l:
        print(f"L{i+1}: {l.strip()}")
