import re
import json

HTML_PATH = r"D:/Projects/eraser_hideandseek/index (배포용).html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    text = f.read()
    lines = text.splitlines()

def get_slice(start, end):
    return "\n".join(lines[start-1:end])

# 1. Network analysis
network_lines = get_slice(3483, 4110)
# Look for WS URLs, PeerJS, signaling server, packet types
ws_urls = re.findall(r'wss?://[^\s\'"`,]+', network_lines)
packet_types = re.findall(r'(?:type|t):\s*["\']([a-zA-Z0-9_-]+)["\']', network_lines)

# 2. Maps analysis
maps_lines = get_slice(1994, 2076)
map_keys = re.findall(r'(\w+):\s*\{\s*name:\s*["\']([^"\']+)["\']', maps_lines)

# 3. Game settings / constants
# Look around lines 2349-2400 (Game State)
gamestate_lines = get_slice(2340, 2400)

# 4. Teacher panel actions
teacher_lines = get_slice(4891, 5026)
teacher_buttons = re.findall(r'btnTeacher\w+|btnFreeze|btnHint|btnExtend', teacher_lines)

# 5. Minigame in pencil case
minigame_lines = get_slice(4150, 4419)

analysis = {
    "ws_urls": list(set(ws_urls)),
    "packet_types": list(set(packet_types)),
    "map_keys": map_keys,
    "teacher_buttons": list(set(teacher_buttons)),
    "network_snippet_len": len(network_lines),
    "minigame_snippet_len": len(minigame_lines)
}

with open(r"D:/Projects/eraser_hideandseek/intermediate_results/deep_details.json", "w", encoding="utf-8-sig") as f:
    json.dump(analysis, f, ensure_ascii=False, indent=2)

print("WS URLs found:", ws_urls)
print("Maps found:", map_keys)
print("Packet types found (sample):", packet_types[:20])
