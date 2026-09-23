# -*- coding: utf-8 -*-
import os, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

d_projects = r"D:\Projects"
print("Scanning D:\\Projects for other folders...")
for item in os.listdir(d_projects):
    p = os.path.join(d_projects, item)
    if os.path.isdir(p):
        print(f"Dir: {item}")
