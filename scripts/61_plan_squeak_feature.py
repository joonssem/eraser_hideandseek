import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

with open("index.html", "r", encoding="utf-8") as f:
    text = f.read()

print("File loaded, length:", len(text))
# Check if sfxSqueak already exists
print("sfxSqueak in text:", "sfxSqueak" in text)
# Check if tauntBtn exists
print("tauntBtn in text:", "tauntBtn" in text)
