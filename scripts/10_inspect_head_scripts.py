HTML_PATH = r"D:/Projects/eraser_hideandseek/index (배포용).html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Lines 340 to 410 ---")
for i in range(339, min(len(lines), 415)):
    print(f"{i+1}: {lines[i].rstrip()}")
