import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("=== Lines 3460 - 3550: Pointermove, Pointerup, Mobile Joypad ===")
for idx in range(3460, min(3550, len(lines))):
    print(f"{idx+1}: {lines[idx]}", end="")

print("\n=== Lines 250 - 330: CSS Mobile / Joypad ===")
for idx in range(250, min(330, len(lines))):
    print(f"{idx+1}: {lines[idx]}", end="")
