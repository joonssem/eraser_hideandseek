HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Search for playerDims
for i, l in enumerate(lines):
    if "function playerDims" in l or "playerDims=" in l or "const playerDims" in l:
        print(f"--- playerDims at L{i+1} ---")
        for j in range(i, min(i+30, len(lines))):
            print(f"{j+1}: {lines[j].rstrip()}")
        break

# Search for poseFitsHere
for i, l in enumerate(lines):
    if "function poseFitsHere" in l:
        print(f"\n--- poseFitsHere at L{i+1} ---")
        for j in range(i, min(i+40, len(lines))):
            print(f"{j+1}: {lines[j].rstrip()}")
        break

# Search for tryJudge
for i, l in enumerate(lines):
    if "function tryJudge" in l:
        print(f"\n--- tryJudge at L{i+1} ---")
        for j in range(i, min(i+65, len(lines))):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
