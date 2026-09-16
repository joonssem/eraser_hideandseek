HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- addBox and addCyl definitions ---")
for i in range(850, 930):
    if i < len(lines):
        if "function addBox" in lines[i] or "function addCyl" in lines[i]:
            for j in range(i, min(i+45, len(lines))):
                print(f"{j+1}: {lines[j].rstrip()}")
            break
