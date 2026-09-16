HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Lines 1565 to 1630 (Cafeteria tables, trays, conveyor) ---")
for i in range(1564, 1630):
    print(f"{i+1}: {lines[i].rstrip()}")
