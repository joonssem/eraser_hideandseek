HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    text = f.read()
    lines = text.splitlines()

# 1. Find buildCafeteria
start_cafeteria = -1
end_cafeteria = -1
for i, l in enumerate(lines):
    if "function buildCafeteria" in l:
        start_cafeteria = i + 1
    if start_cafeteria > 0 and i > start_cafeteria and ("function buildLibrary" in l or "/* ===" in l):
        end_cafeteria = i
        break

print(f"Cafeteria is from line {start_cafeteria} to {end_cafeteria}")

# 2. Inspect food items in buildCafeteria
food_lines = []
for i in range(start_cafeteria - 1, end_cafeteria):
    l = lines[i]
    if any(k in l.lower() for k in ["food", "rice", "soup", "dish", "plate", "tray", "음식", "밥", "국", "반찬", "식판"]):
        food_lines.append(f"L{i+1}: {l.strip()}")

print("\n--- Food lines in Cafeteria ---")
for fl in food_lines[:30]:
    print(fl)

# 3. Inspect tryJudge (lines 3113 to 3228)
judge_lines = []
for i in range(3110, 3230):
    if i < len(lines):
        judge_lines.append(f"L{i+1}: {lines[i]}")

with open("D:/Projects/eraser_hideandseek/intermediate_results/cafeteria_food_analysis.txt", "w", encoding="utf-8") as f:
    f.write("=== CAFETERIA LINES ===\n")
    f.write("\n".join(lines[start_cafeteria-1:end_cafeteria]))
    f.write("\n\n=== TRYJUDGE LINES ===\n")
    f.write("\n".join(judge_lines))

print(f"\nSaved analysis. Food lines count: {len(food_lines)}")
