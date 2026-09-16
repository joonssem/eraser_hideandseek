import os
import re
import json

HTML_PATH = r"D:/Projects/eraser_hideandseek/index (배포용).html"

def analyze_html():
    if not os.path.exists(HTML_PATH):
        print(f"File not found: {HTML_PATH}")
        return

    with open(HTML_PATH, "r", encoding="utf-8") as f:
        content = f.read()
        lines = content.splitlines()

    total_lines = len(lines)
    total_chars = len(content)

    # Find script tags
    script_pattern = re.compile(r'<script\b([^>]*)>(.*?)</script>', re.DOTALL | re.IGNORECASE)
    style_pattern = re.compile(r'<style\b([^>]*)>(.*?)</style>', re.DOTALL | re.IGNORECASE)

    styles = []
    for m in style_pattern.finditer(content):
        attrs = m.group(1)
        css_body = m.group(2)
        styles.append({
            "attrs": attrs.strip(),
            "line_count": len(css_body.splitlines()),
            "char_count": len(css_body),
            "start_pos": m.start(),
            "end_pos": m.end()
        })

    scripts = []
    for m in script_pattern.finditer(content):
        attrs = m.group(1)
        js_body = m.group(2)
        src_match = re.search(r'src=["\']([^"\']+)["\']', attrs)
        src = src_match.group(1) if src_match else None
        scripts.append({
            "src": src,
            "attrs": attrs.strip(),
            "line_count": len(js_body.splitlines()),
            "char_count": len(js_body),
            "is_external": src is not None
        })

    # Find UI screens / major divs
    screens = re.findall(r'id=["\'](screen\w+|[a-zA-Z0-9_-]+Screen|[a-zA-Z0-9_-]+Modal|[a-zA-Z0-9_-]+Panel|[a-zA-Z0-9_-]+Overlay)[\'"]', content)
    unique_screens = sorted(list(set(screens)))

    # Find key variables/classes/functions in JS
    functions = re.findall(r'function\s+([a-zA-Z0-9_$]+)\s*\(', content)
    classes = re.findall(r'class\s+([a-zA-Z0-9_$]+)', content)
    consts_vars = re.findall(r'(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=', content)

    # Check for networking/multiplayer indicators
    networking_keywords = ["peerjs", "webrtc", "socket.io", "partykit", "firebase", "websocket", "rtc", "room", "host", "guest", "broadcast", "channel"]
    networking_found = {}
    for kw in networking_keywords:
        matches = len(re.findall(re.escape(kw), content, re.IGNORECASE))
        if matches > 0:
            networking_found[kw] = matches

    # Check for 3D/graphics indicators
    graphics_keywords = ["three", "webgl", "camera", "scene", "renderer", "mesh", "geometry", "material", "light", "shadow", "gltf", "fbx", "obj"]
    graphics_found = {}
    for kw in graphics_keywords:
        matches = len(re.findall(re.escape(kw), content, re.IGNORECASE))
        if matches > 0:
            graphics_found[kw] = matches

    # Check for audio indicators
    audio_keywords = ["audio", "sound", "synthesizer", "audiocontext", "oscillator", "gainnode", "play", "bgm", "sfx"]
    audio_found = {}
    for kw in audio_keywords:
        matches = len(re.findall(re.escape(kw), content, re.IGNORECASE))
        if matches > 0:
            audio_found[kw] = matches

    result = {
        "file_name": os.path.basename(HTML_PATH),
        "total_lines": total_lines,
        "total_chars": total_chars,
        "styles_count": len(styles),
        "styles_summary": styles,
        "scripts_count": len(scripts),
        "external_scripts": [s["src"] for s in scripts if s["is_external"]],
        "inline_scripts_count": len([s for s in scripts if not s["is_external"]]),
        "screens_panels": unique_screens,
        "classes": list(set(classes)),
        "function_count": len(functions),
        "top_functions": functions[:40],
        "networking_indicators": networking_found,
        "graphics_indicators": graphics_found,
        "audio_indicators": audio_found
    }

    os.makedirs(r"D:/Projects/eraser_hideandseek/intermediate_results", exist_ok=True)
    out_path = r"D:/Projects/eraser_hideandseek/intermediate_results/html_structure_analysis.json"
    with open(out_path, "w", encoding="utf-8") as out_f:
        json.dump(result, out_f, ensure_ascii=False, indent=2)

    print(f"Analysis saved to {out_path}")
    print(f"Total lines: {total_lines}")
    print(f"External scripts: {result['external_scripts']}")
    print(f"Inline scripts line counts: {[s['line_count'] for s in scripts if not s['is_external']]}")
    print(f"Classes: {result['classes']}")
    print(f"Total functions found: {len(functions)}")

if __name__ == "__main__":
    analyze_html()
