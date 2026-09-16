HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Lines around 3530-3600 (createRoom) ---")
for i in range(3525, min(3650, len(lines))):
    if "createRoom" in lines[i] or "joinRoom" in lines[i]:
        for j in range(max(0, i-5), min(len(lines), i+45)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
