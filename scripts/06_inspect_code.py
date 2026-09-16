import re
import json

HTML_PATH = r"D:/Projects/eraser_hideandseek/index (배포용).html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    text = f.read()
    lines = text.splitlines()

# Search for FIREBASE_SERVERS
fb_servers = []
for i, l in enumerate(lines):
    if "FIREBASE_SERVERS" in l or "firebaseConfig" in l or "databaseURL" in l:
        fb_servers.append((i+1, l.strip()))

# Search for Audio functions
audio_funcs = []
for i in range(700, 760):
    if i < len(lines):
        audio_funcs.append(lines[i])

# Search for maps definition & sizes
map_funcs = ["buildMap", "buildScienceLab", "buildCafeteria", "buildLibrary"]
map_details = {}
for mf in map_funcs:
    for idx, l in enumerate(lines):
        if f"function {mf}" in l or f"const {mf}" in l:
            map_details[mf] = idx + 1

# Search for Minigame details
minigame_snippet = "\n".join(lines[4145:4250])

# Search for Teacher panel features
teacher_snippet = "\n".join(lines[4890:5025])

# Search for Game settings defaults
settings = []
for i, l in enumerate(lines):
    if "hideTime" in l or "seekTime" in l or "SEEKER_COUNT" in l or "GAME_SETTINGS" in l:
        if i < 2400 and ("let " in l or "const " in l or "var " in l or ":" in l):
            settings.append((i+1, l.strip()))

result = {
    "fb_servers_lines": fb_servers[:10],
    "map_details": map_details,
    "settings_lines": settings[:15],
    "minigame_sample": minigame_snippet[:1000],
    "teacher_sample": teacher_snippet[:1000]
}

with open("D:/Projects/eraser_hideandseek/intermediate_results/code_inspection.json", "w", encoding="utf-8-sig") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print("Inspection complete.")
print("FB Server lines:", len(fb_servers))
print("Map details:", map_details)
