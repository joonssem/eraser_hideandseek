# -*- coding: utf-8 -*-
import zipfile

with zipfile.ZipFile("index (배포용).zip", 'r') as z:
    print(z.namelist())
