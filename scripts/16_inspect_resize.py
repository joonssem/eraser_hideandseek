HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Lines 5140 to 5170 (Resize / Orientation / Tab) ---")
for i in range(5135, min(5175, len(lines))):
    print(f"{i+1}: {lines[i].rstrip()}")
