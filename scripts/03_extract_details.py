import re
import json

HTML_PATH = r"D:/Projects/eraser_hideandseek/index (배포용).html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Let's inspect importmap
importmap_content = ""
in_importmap = False
for line in lines:
    if '<script type="importmap">' in line:
        in_importmap = True
        continue
    if in_importmap:
        if '</script>' in line:
            in_importmap = False
            break
        importmap_content += line

print("--- IMPORT MAP ---")
print(importmap_content.strip())

# Inspect headers in UTF-8 cleanly
headers = []
for idx, line in enumerate(lines):
    line_num = idx + 1
    # Match comment blocks
    m = re.search(r'(?:/\*|//)\s*={3,}\s*(.*?)\s*={3,}(?:\*/)?', line)
    if m:
        title = m.group(1).strip()
        if title:
            headers.append({"line": line_num, "title": title, "raw": line.strip()})

with open(r"D:/Projects/eraser_hideandseek/intermediate_results/sections_cleaned.json", "w", encoding="utf-8-sig") as f:
    json.dump({"importmap": importmap_content, "headers": headers}, f, ensure_ascii=False, indent=2)

for h in headers:
    print(f"L{h['line']}: {h['title']}")
