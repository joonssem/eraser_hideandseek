HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Lines around 4300-4400 (Result logic) ---")
for i in range(4300, min(4420, len(lines))):
    if "enterResult" in lines[i] or "resultBody" in lines[i] or "reveal" in lines[i].lower():
        for j in range(max(0, i-5), min(len(lines), i+45)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
