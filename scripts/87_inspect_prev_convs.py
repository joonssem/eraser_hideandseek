# -*- coding: utf-8 -*-
import sys, io, json, os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conv_ids = [
    "7ae13f91-f7a7-4278-8db6-fead623a8606",
    "eb663f5c-6ae3-4831-ad8c-09853cfe35a6",
    "830978fe-1451-4be4-8bfa-5971fd306046",
    "9d6abdd0-8337-4ff0-a6b4-12820a1977f5",
    "9f1be6e5-86c7-4e19-b355-fab85b6a93f6"
]

for cid in conv_ids:
    p = rf"C:\Users\PC\.gemini\antigravity-cli\brain\{cid}\.system_generated\logs\transcript.jsonl"
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                try:
                    data = json.loads(line)
                    txt = str(data.get("content", "")) + str(data.get("thinking", ""))
                    if "기차" in txt or "돌봄" in txt:
                        print(f"[{cid}] Type: {data.get('type')}")
                        if "돌봄" in txt:
                            for sub in txt.split("\n"):
                                if "돌봄" in sub or "기차" in sub:
                                    print("   ", sub[:140])
                except:
                    pass
