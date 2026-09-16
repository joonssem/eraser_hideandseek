HTML_PATH = r"D:/Projects/eraser_hideandseek/index (배포용).html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Lines around 1994 (Map registry) ---")
for i in range(1990, min(2040, len(lines))):
    print(f"{i+1}: {lines[i].strip()}")

print("\n--- Lines around 3483 (Networking) ---")
for i in range(3480, min(3530, len(lines))):
    print(f"{i+1}: {lines[i].strip()}")
