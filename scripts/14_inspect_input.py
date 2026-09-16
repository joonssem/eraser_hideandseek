HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Lines 3229 to 3350 (Input handling) ---")
for i in range(3228, min(3360, len(lines))):
    print(f"{i+1}: {lines[i].rstrip()}")
