# -*- coding: utf-8 -*-
import os

keywords = ["돌봄", "기차", "train", "care", "카트", "cart", "rail", "track"]

for root, dirs, files in os.walk("."):
    if ".git" in root:
        continue
    for file in files:
        path = os.path.join(root, file)
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            for kw in keywords:
                if kw in content.lower():
                    count = content.lower().count(kw)
                    print(f"{path}: contains '{kw}' {count} times")
        except Exception as e:
            pass
