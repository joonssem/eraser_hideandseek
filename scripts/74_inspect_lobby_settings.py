import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(480, 540):
    if i < len(lines):
        if "settings" in lines[i] or "paintSec" in lines[i] or "seekSec" in lines[i] or "chk" in lines[i]:
            print(f"L{i+1}: {lines[i].strip()}")
