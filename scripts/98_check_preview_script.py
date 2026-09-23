# -*- coding: utf-8 -*-
"""
scripts/98_check_preview_script.py
maps/preview.html 내의 <script type="module"> 태그 내용을 추출하여 문법 검사
"""

import re
import subprocess
import os

with open("maps/preview.html", "r", encoding="utf-8") as f:
    content = f.read()

match = re.search(r'<script type="module">(.*?)</script>', content, re.DOTALL)
if match:
    script_content = match.group(1)
    temp_file = "intermediate_results/temp_preview_script.mjs"
    with open(temp_file, "w", encoding="utf-8") as f:
        f.write(script_content)
    
    res = subprocess.run(["node", "--check", temp_file], capture_output=True, text=True)
    print("Return code:", res.returncode)
    print("Stdout:", res.stdout)
    print("Stderr:", res.stderr)
    if res.returncode == 0:
        print(">>> SUCCESS: preview.html 내 module script 문법 에러 0건 (완벽 통과)!")
    if os.path.exists(temp_file):
        os.remove(temp_file)
else:
    print("Module script not found in preview.html")
