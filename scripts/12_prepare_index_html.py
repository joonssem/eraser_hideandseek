import shutil
import os

src = r"D:/Projects/eraser_hideandseek/index (배포용).html"
primary = r"D:/Projects/eraser_hideandseek/primary_data/index (배포용).html"
dest = r"D:/Projects/eraser_hideandseek/index.html"

# Preserve original in primary_data
if not os.path.exists(primary):
    shutil.copy2(src, primary)
    print(f"Backed up original file to {primary}")

# Create index.html at root for editing and deployment
if not os.path.exists(dest):
    shutil.copy2(src, dest)
    print(f"Created standard deployable entrypoint {dest}")
else:
    print(f"{dest} already exists.")
