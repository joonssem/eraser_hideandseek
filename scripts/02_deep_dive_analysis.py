import re
import json

HTML_PATH = r"D:/Projects/eraser_hideandseek/index (배포용).html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# Let's inspect where scripts are and line ranges
lines = content.splitlines()

# Let's find script tag line numbers
script_ranges = []
in_script = False
start_line = 0
script_attrs = ""
for idx, line in enumerate(lines):
    if "<script" in line:
        in_script = True
        start_line = idx + 1
        script_attrs = line
    if "</script>" in line and in_script:
        in_script = False
        script_ranges.append((start_line, idx + 1, script_attrs))

print("Script ranges:")
for s, e, attr in script_ranges:
    print(f"Lines {s}-{e}: {attr[:60]}")

# Let's find major sections or comments in the largest script
if script_ranges:
    large_s, large_e, _ = max(script_ranges, key=lambda x: x[1] - x[0])
    print(f"\nAnalyzing largest script block: lines {large_s} to {large_e}")
    large_script_lines = lines[large_s-1:large_e]
    
    # Check for comment headers like /* ===== ... ===== */ or // =====
    headers = []
    for i, l in enumerate(large_script_lines):
        line_no = large_s + i
        if re.search(r'(//|/\*)\s*={3,}.*={3,}', l):
            headers.append((line_no, l.strip()))
        elif l.strip().startswith("/*") and "====" in l:
            headers.append((line_no, l.strip()))
        elif l.strip().startswith("// ===="):
            headers.append((line_no, l.strip()))
        elif re.match(r'^\s*//\s*\[[0-9A-Za-z_-]+\]', l):
            headers.append((line_no, l.strip()))

    print(f"Found {len(headers)} section headers:")
    for h in headers[:50]:
        print(f"Line {h[0]}: {h[1]}")
    if len(headers) > 50:
        print(f"... and {len(headers) - 50} more")

    # Let's check 3D library used: Three.js? Raw WebGL?
    three_match = re.search(r'THREE\.', content)
    peer_match = re.search(r'Peer\(', content)
    print(f"Uses THREE.js: {bool(three_match)}")
    print(f"Uses PeerJS: {bool(peer_match)}")

    # Let's check if Three.js or PeerJS is inlined or bundled
    if "THREE.WebGLRenderer" in content or "THREE.Scene" in content:
        print("THREE.js is used!")
        # where is THREE defined?
        for i, l in enumerate(lines[:1000]):
            if "THREE" in l and ("var THREE" in l or "const THREE" in l or "THREE=" in l or "three.min.js" in l):
                print(f"THREE definition at line {i+1}: {l[:100]}")
    
    # Save section headers to intermediate_results
    with open("D:/Projects/eraser_hideandseek/intermediate_results/script_sections.json", "w", encoding="utf-8") as out:
        json.dump({"script_ranges": script_ranges, "headers": headers}, out, ensure_ascii=False, indent=2)
