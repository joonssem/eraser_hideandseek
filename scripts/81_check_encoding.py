# -*- coding: utf-8 -*-
with open("index.html", "rb") as f:
    raw = f.read(5000)

for enc in ["utf-8", "cp949", "euc-kr", "utf-16"]:
    try:
        decoded = raw.decode(enc)
        print(f"{enc}: SUCCESS - sample: {repr(decoded[500:600])}")
    except Exception as e:
        print(f"{enc}: FAILED - {e}")
