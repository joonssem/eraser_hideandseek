HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Check viewport meta tag (around lines 1-15)
print("--- Meta tags & Root CSS ---")
for i in range(0, 25):
    print(f"{i+1}: {lines[i].rstrip()}")

# Check touch event listeners in JS (around input / mobile controls)
touch_listeners = []
for i, l in enumerate(lines):
    if "touchstart" in l or "touchmove" in l or "touchend" in l or "gesture" in l or "visualViewport" in l or "user-scalable" in l:
        touch_listeners.append(f"L{i+1}: {l.strip()[:100]}")

print("\n--- Touch / Gesture matches count:", len(touch_listeners))
for m in touch_listeners[:20]:
    print(m)

# Check mobile control css (around line 295)
print("\n--- Mobile controls CSS ---")
for i in range(290, 335):
    if i < len(lines):
        print(f"{i+1}: {lines[i].rstrip()}")
