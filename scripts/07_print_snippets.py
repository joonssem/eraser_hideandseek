HTML_PATH = r"D:/Projects/eraser_hideandseek/index (배포용).html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Firebase Config snippet ---")
for i, l in enumerate(lines[:400]):
    if "FIREBASE_SERVERS" in l or "apiKey" in l or "databaseURL" in l:
        for j in range(max(0, i-2), min(len(lines), i+15)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break

print("\n--- Audio functions snippet (700-745) ---")
for i in range(703, 745):
    print(f"{i+1}: {lines[i].rstrip()}")

print("\n--- Minigame in pencil case snippet (4150-4200) ---")
for i in range(4148, 4190):
    print(f"{i+1}: {lines[i].rstrip()}")

print("\n--- Teacher panel snippet (4890-4950) ---")
for i in range(4890, 4945):
    print(f"{i+1}: {lines[i].rstrip()}")
