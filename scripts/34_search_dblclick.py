with open("index.html", "r", encoding="utf-8") as f:
    c = f.read()

print("dblclick in index.html?", "dblclick" in c)
print("touchstart in index.html?", "touchstart" in c)
print("visualViewport in index.html?", "visualViewport" in c)
print("scale in index.html?", c.count("scale"))
print("pointercancel in index.html?", "pointercancel" in c)
