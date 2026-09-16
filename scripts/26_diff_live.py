import difflib

with open("D:/Projects/eraser_hideandseek/intermediate_results/live_index.html", "r", encoding="utf-8", errors="ignore") as f:
    live = f.readlines()

with open("D:/Projects/eraser_hideandseek/index (배포용).html", "r", encoding="utf-8", errors="ignore") as f:
    local = f.readlines()

diff = list(difflib.unified_diff(local, live, fromfile="local", tofile="live", n=2))

print(f"Total diff lines: {len(diff)}")

# Print the first few blocks of differences
diff_blocks = "".join(diff[:80])
print(diff_blocks)

with open("D:/Projects/eraser_hideandseek/intermediate_results/live_vs_local_diff.txt", "w", encoding="utf-8") as f:
    f.writelines(diff)
