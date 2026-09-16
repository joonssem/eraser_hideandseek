HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

results = []
for i, l in enumerate(lines):
    if "collide:false" in l.replace(" ", "") and "sample:true" in l.replace(" ", ""):
        results.append(f"L{i+1}: {l.strip()}")

print(f"Found {len(results)} occurrences of collide:false, sample:true:")
for r in results:
    print(r)
