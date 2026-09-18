import re

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

lines = content.splitlines()
print(f"Total lines: {len(lines)}")

# Find sections related to role, seeker, tagger, pencil, caseGame, joyBase, mobileUI
keywords = ["caseGame", "joyBase", "isTagger", "isSeeker", "role", "술래", "pencil", "SEEK", "btnResetZoom", "updateMobileButtons"]
for kw in keywords:
    matches = [i+1 for i, line in enumerate(lines) if kw in line]
    print(f"Keyword '{kw}': {len(matches)} matches, first 5 lines: {matches[:5]}")

# Look for tagger determination / role assignment
for i, line in enumerate(lines):
    if "isTagger" in line or "isSeeker" in line or "tagger" in line.lower() or "술래" in line:
        if i < 3000: # first few
            print(f"L{i+1}: {line[:100]}")
            if len(matches) > 30:
                pass
