# -*- coding: utf-8 -*-
import sys
import io
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open("index.html", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# Find all function build...
funcs = re.findall(r"function\s+(build\w+)\s*\(", text)
print("Build functions:", funcs)

# Search for maps in select options
select_maps = re.findall(r'<option[^>]*value=["\']([^"\']+)["\'][^>]*>([^<]+)</option>', text)
print("Select options:", select_maps)
