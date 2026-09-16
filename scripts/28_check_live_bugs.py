with open("D:/Projects/eraser_hideandseek/intermediate_results/live_index.html", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

print("Live has gesturestart:", "gesturestart" in text)
print("Live has visualViewport:", "visualViewport" in text)
print("Live has isJudgeBlocked:", "isJudgeBlocked" in text)

# Check cafeteria dish in live
start = text.find("const dish=(tx,base,chunk,garnish,sauce)=>{")
if start != -1:
    print("\nLive cafeteria dish snippet:")
    print(text[start:start+400])
