HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Check lines around showResult (lines 4350-4450)
print("--- Result lines ---")
for i, l in enumerate(lines):
    if "function showResult" in l or "function enterResult" in l or "id=\"screenResult\"" in l:
        print(f"L{i+1}: {l.strip()}")
        for j in range(max(0, i-5), min(len(lines), i+35)):
            print(f"  {j+1}: {lines[j].rstrip()}")
        break

# Check ghost role lines
print("\n--- Ghost role matches ---")
for i, l in enumerate(lines):
    if 'role==="ghost"' in l.replace(" ", "") or 'role===\'ghost\'' in l.replace(" ", ""):
        print(f"L{i+1}: {l.strip()[:100]}")
