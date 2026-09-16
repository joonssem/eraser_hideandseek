HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Check style end
style_end = text.find("</style>")
print(f"</style> at position {style_end}")

# 2. Check HUD position
hud_pos = text.find('<div id="hud"')
print(f'<div id="hud" at position {hud_pos}')

# 3. Check tick() / render loop
tick_pos = text.find('function tick(')
if tick_pos == -1:
    tick_pos = text.find('function animate(')
if tick_pos == -1:
    tick_pos = text.find('requestAnimationFrame')
print(f'Animation loop at position {tick_pos}')
