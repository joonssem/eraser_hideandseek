from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
dirs = [
    ROOT / "primary_data",
    ROOT / "secondary_data",
    ROOT / "intermediate_results",
    ROOT / "visualizations",
    ROOT / "docs",
    ROOT / "scripts",
]

for directory in dirs:
    directory.mkdir(parents=True, exist_ok=True)
    print(f"Directory ready: {directory}")
