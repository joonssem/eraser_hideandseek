with open("D:/Projects/eraser_hideandseek/intermediate_results/live_index.html", "r", encoding="utf-8", errors="ignore") as f:
    live_lines = f.readlines()

print("--- Live lines 350 to 410 ---")
for i in range(350, min(410, len(live_lines))):
    print(f"{i+1}: {live_lines[i].rstrip()}")

print("\n--- Live lines 650 to 710 ---")
for i in range(650, min(710, len(live_lines))):
    print(f"{i+1}: {live_lines[i].rstrip()}")
