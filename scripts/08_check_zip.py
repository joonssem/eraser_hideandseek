import zipfile

with zipfile.ZipFile(r"D:/Projects/eraser_hideandseek/index (배포용).zip", 'r') as z:
    print("Zip contents:")
    for info in z.infolist():
        print(f"  {info.filename} ({info.file_size} bytes)")
