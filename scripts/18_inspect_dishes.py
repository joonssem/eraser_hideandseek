HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Lines 1510 to 1565 (Cafeteria dishes & food) ---")
for i in range(1509, 1565):
    print(f"{i+1}: {lines[i].rstrip()}")
