HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Lines around 4500-4570 (updateHUD) ---")
for i in range(4500, min(4580, len(lines))):
    if "function updateHUD" in lines[i]:
        for j in range(i, min(len(lines), i+45)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
