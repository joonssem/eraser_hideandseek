import os

dirs = [
    r"D:/Projects/eraser_hideandseek/primary_data",
    r"D:/Projects/eraser_hideandseek/secondary_data",
    r"D:/Projects/eraser_hideandseek/intermediate_results",
    r"D:/Projects/eraser_hideandseek/visualizations",
    r"D:/Projects/eraser_hideandseek/interim_reports",
    r"D:/Projects/eraser_hideandseek/scripts"
]

for d in dirs:
    os.makedirs(d, exist_ok=True)
    print(f"Directory ready: {d}")
