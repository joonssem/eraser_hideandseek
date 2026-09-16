import subprocess
import os

HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# Check if node is available to check syntax of the module script
try:
    # extract the script type="module"
    start_tag = '<script type="module">'
    end_tag = '</script>'
    s_idx = content.find(start_tag)
    e_idx = content.rfind(end_tag)
    if s_idx != -1 and e_idx != -1:
        js_code = content[s_idx + len(start_tag):e_idx]
        test_js = r"D:/Projects/eraser_hideandseek/intermediate_results/test_bundle.js"
        with open(test_js, "w", encoding="utf-8") as out_js:
            out_js.write(js_code)
        
        node_res = subprocess.run(["node", "--check", test_js], capture_output=True, text=True)
        print("Node check exit code:", node_res.returncode)
        if node_res.returncode == 0:
            print("JavaScript syntax check PASSED! No errors.")
        else:
            print("JavaScript syntax error:")
            print(node_res.stderr)
except Exception as e:
    print("Could not run node check:", e)
