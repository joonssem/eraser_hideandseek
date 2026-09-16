HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Lines around 5170-5240 (Main loop) ---")
for i in range(5165, min(5240, len(lines))):
    print(f"{i+1}: {lines[i].rstrip()}")
