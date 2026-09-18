import sys
import re

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    text = f.read()

# Find all occurrences of pointerdown, touchstart, onclick
pattern = re.compile(r'(\$\(["\'][^"\']+["\']\)\.(onpointerdown|ontouchstart|onclick)\s*=\s*[^;]+;)')
matches = pattern.findall(text)
print(f"Found {len(matches)} button bindings:")
for m in matches:
    print(m[0][:90])

print("\n--- Checking all touch-actions in CSS ---")
css_matches = re.findall(r'([^{}]*touch-action[^{}]*)', text)
for c in css_matches:
    print(c.strip()[:100])
