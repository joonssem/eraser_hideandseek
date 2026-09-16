HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Lines 4385 to 4450 ---")
for i in range(4385, min(4450, len(lines))):
    print(f"{i+1}: {lines[i].rstrip()}")
