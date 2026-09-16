import urllib.request
import os
import hashlib

LIVE_URL = "https://find-eraser2.netlify.app/"
LOCAL_PATH = r"D:/Projects/eraser_hideandseek/index (배포용).html"

try:
    req = urllib.request.Request(LIVE_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as response:
        live_html = response.read()

    os.makedirs(r"D:/Projects/eraser_hideandseek/intermediate_results", exist_ok=True)
    live_path = r"D:/Projects/eraser_hideandseek/intermediate_results/live_index.html"
    with open(live_path, "wb") as f:
        f.write(live_html)

    with open(LOCAL_PATH, "rb") as f:
        local_html = f.read()

    live_hash = hashlib.md5(live_html).hexdigest()
    local_hash = hashlib.md5(local_html).hexdigest()

    print(f"Live HTML size: {len(live_html)} bytes, MD5: {live_hash}")
    print(f"Local HTML size: {len(local_html)} bytes, MD5: {local_hash}")
    print(f"Identical: {live_hash == local_hash}")

    # If different, let's see differences in line counts or Firebase config
    live_lines = live_html.decode('utf-8', errors='ignore').splitlines()
    local_lines = local_html.decode('utf-8', errors='ignore').splitlines()
    print(f"Live lines: {len(live_lines)}, Local lines: {len(local_lines)}")

    # Check firebaseConfig in live
    for i, l in enumerate(live_lines[:400]):
        if "firebaseConfig" in l or "databaseURL" in l:
            for j in range(max(0, i-2), min(len(live_lines), i+12)):
                print(f"Live L{j+1}: {live_lines[j]}")
            break

except Exception as e:
    print(f"Error fetching live URL: {e}")
