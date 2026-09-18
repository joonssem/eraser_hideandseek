import sys
import re

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

HTML_PATH = "index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    content = f.read()

print("Original size:", len(content))

# 1. Update CSS: btnResetZoom position to left: 14px, canvas.gl to 100% full, crosshair cooldown style
old_btn_style = '''#btnResetZoom{position:fixed;right:14px;top:14px;z-index:45;font-size:12px;font-weight:800;
  padding:7px 11px;border-radius:12px;background:rgba(255,248,231,.94);border:2px solid var(--ink);
  box-shadow:2px 2px 0 rgba(0,0,0,.3);cursor:pointer;pointer-events:auto;}'''

new_btn_style = '''#btnResetZoom{position:fixed;left:14px;top:14px;z-index:99999;font-size:13px;font-weight:900;
  padding:8px 13px;border-radius:12px;background:rgba(255,248,231,.96);border:3px solid var(--ink);
  box-shadow:3px 3px 0 rgba(0,0,0,.35);cursor:pointer;pointer-events:auto;}
canvas.gl{position:fixed !important;inset:0 !important;width:100vw !important;height:100vh !important;display:block;touch-action:none !important;}
#crosshair.cooldown{opacity:.35;filter:grayscale(1);}'''

assert old_btn_style in content, "old_btn_style not found!"
content = content.replace(old_btn_style, new_btn_style, 1)

# 2. Update screenToNDC to be visualViewport-aware
old_screen_ndc = '''function screenToNDC(cx,cy){ ndc.set(cx/innerWidth*2-1,-(cy/innerHeight)*2+1); return ndc; }'''
new_screen_ndc = '''function screenToNDC(cx,cy){
  const w=(window.visualViewport?window.visualViewport.width:innerWidth);
  const h=(window.visualViewport?window.visualViewport.height:innerHeight);
  const ox=(window.visualViewport?window.visualViewport.offsetLeft:0);
  const oy=(window.visualViewport?window.visualViewport.offsetTop:0);
  ndc.set(((cx-ox)/w)*2-1, -(((cy-oy)/h)*2-1));
  return ndc;
}'''

assert old_screen_ndc in content, "old_screen_ndc not found!"
content = content.replace(old_screen_ndc, new_screen_ndc, 1)

# 3. Update tryJudge cooldown: 1500ms -> 800ms, and give feedback when on cooldown
old_judge_cd = '''  // 실패: 심 부러짐 + 1.5초 쿨다운
  G.cdUntil=now+1500;
  Audio2.sfxBreak();
  shake();
  const p=new THREE.Vector3();
  p.copy(camera.position).addScaledVector(judgeRay.ray.direction,2);
  burst(p,"#444444",5,1.5,0.35,false,0.2);
}'''

new_judge_cd = '''  // 실패: 심 부러짐 + 0.8초 쿨다운 (박진감 강화 및 먹통 오해 방지)
  G.cdUntil=now+800;
  Audio2.sfxBreak();
  shake();
  const p=new THREE.Vector3();
  p.copy(camera.position).addScaledVector(judgeRay.ray.direction,2);
  burst(p,"#444444",5,1.5,0.35,false,0.2);
}'''

assert old_judge_cd in content, "old_judge_cd not found!"
content = content.replace(old_judge_cd, new_judge_cd, 1)

# Also in tryJudge start:
old_try_judge_start = '''async function tryJudge(cx,cy){
  if(G.role!=="seeker"||G.phase!=="SEEK")return;
  const now=performance.now();
  if(now<G.cdUntil)return;

  pokePencil();'''

new_try_judge_start = '''async function tryJudge(cx,cy){
  if(G.role!=="seeker"||G.phase!=="SEEK")return;
  const now=performance.now();
  if(now<G.cdUntil){
    toast("✏️ 연필 심 깎는 중... 잠시만요!");
    return;
  }

  pokePencil();'''

assert old_try_judge_start in content, "old_try_judge_start not found!"
content = content.replace(old_try_judge_start, new_try_judge_start, 1)

# 4. Implement mobile "Tap-to-Shoot" (모바일 화면 탭으로 즉시 연필 발사)
old_pointer_down_look = '''  const effectiveWidth=(window.visualViewport?window.visualViewport.width:innerWidth);
  if(e.clientX<effectiveWidth*0.45&&joyId===null){
    joyId=e.pointerId; joyOrigin=[e.clientX,e.clientY];
    const jb=$("joyBase"); jb.style.display="block";
    jb.style.left=(e.clientX-60)+"px"; jb.style.top=(e.clientY-60)+"px";
  }else if(lookId===null){ lookId=e.pointerId; lastLook=[e.clientX,e.clientY]; }
});'''

new_pointer_down_look = '''  const effectiveWidth=(window.visualViewport?window.visualViewport.width:innerWidth);
  if(e.clientX<effectiveWidth*0.45&&joyId===null){
    joyId=e.pointerId; joyOrigin=[e.clientX,e.clientY];
    const jb=$("joyBase"); jb.style.display="block";
    jb.style.left=(e.clientX-60)+"px"; jb.style.top=(e.clientY-60)+"px";
  }else if(lookId===null){
    lookId=e.pointerId;
    lastLook=[e.clientX,e.clientY];
    lookStartPos=[e.clientX,e.clientY];
    lookStartTime=performance.now();
    lookMovedDist=0;
  }
});'''

assert old_pointer_down_look in content, "old_pointer_down_look not found!"
content = content.replace(old_pointer_down_look, new_pointer_down_look, 1)

# Define look tracking variables before pointerdown
old_look_vars = '''let joyId=null,lookId=null,joyOrigin=null,lastLook=null,paintTouch=null,spoitMode=false;
let flightUpId=null,flightDownId=null;'''

new_look_vars = '''let joyId=null,lookId=null,joyOrigin=null,lastLook=null,paintTouch=null,spoitMode=false;
let flightUpId=null,flightDownId=null;
let lookStartPos=[0,0],lookStartTime=0,lookMovedDist=0;'''

assert old_look_vars in content, "old_look_vars not found!"
content = content.replace(old_look_vars, new_look_vars, 1)

# In pointermove, track lookMovedDist
old_pointer_move = '''  }else if(e.pointerId===lookId&&lastLook){
    G.yaw-=(e.clientX-lastLook[0])*0.006;
    G.pitch=clamp(G.pitch-(e.clientY-lastLook[1])*0.006,-1.4,1.4);
    lastLook=[e.clientX,e.clientY];
  }'''

new_pointer_move = '''  }else if(e.pointerId===lookId&&lastLook){
    const d=Math.hypot(e.clientX-lookStartPos[0], e.clientY-lookStartPos[1]);
    if(d>lookMovedDist)lookMovedDist=d;
    G.yaw-=(e.clientX-lastLook[0])*0.006;
    G.pitch=clamp(G.pitch-(e.clientY-lastLook[1])*0.006,-1.4,1.4);
    lastLook=[e.clientX,e.clientY];
  }'''

assert old_pointer_move in content, "old_pointer_move not found!"
content = content.replace(old_pointer_move, new_pointer_move, 1)

# In releasePointerInput, detect tap to shoot for seeker
old_release_pointer = '''function releasePointerInput(e){
  if(e.pointerId===joyId){joyId=null;G.moveIn.x=0;G.moveIn.z=0;$("joyBase").style.display="none";
    $("joyKnob").style.left="34px";$("joyKnob").style.top="34px";}
  if(e.pointerId===lookId){lookId=null;lastLook=null;}'''

new_release_pointer = '''function releasePointerInput(e){
  if(e.pointerId===joyId){joyId=null;G.moveIn.x=0;G.moveIn.z=0;$("joyBase").style.display="none";
    $("joyKnob").style.left="34px";$("joyKnob").style.top="34px";}
  if(e.pointerId===lookId){
    // 술래(모바일): 화면을 가볍게 톡 탭했을 때 손가락이 닿은 바로 그 지점으로 즉시 연필 발사(콕 찍기!)
    if(G.role==="seeker"&&G.phase==="SEEK"&&G.screen==="GAME"&&!G.mirror){
      const duration=performance.now()-lookStartTime;
      if(lookMovedDist<18 && duration<380){
        tryJudge(e.clientX,e.clientY);
      }
    }
    lookId=null;lastLook=null;
  }'''

assert old_release_pointer in content, "old_release_pointer not found!"
content = content.replace(old_release_pointer, new_release_pointer, 1)

# 5. Add checkViewportZoomFrame in loop() for instant 16ms self-healing and smart button tracking
old_loop_content = '''function loop(){
  requestAnimationFrame(loop);
  const now=performance.now();
  const dt=Math.min(0.05,(now-lastT)/1000); lastT=now;'''

new_loop_content = '''function checkViewportZoomFrame(){
  if(window.visualViewport){
    const vv=window.visualViewport;
    if(vv.scale>1.01 || vv.offsetLeft>2 || vv.offsetTop>2){
      resetViewportZoom();
    }
    const btn=$("btnResetZoom");
    if(btn && !btn.classList.contains("hidden")){
      btn.style.left=(vv.offsetLeft+14)+"px";
      btn.style.top=(vv.offsetTop+14)+"px";
    }
  }
}

function loop(){
  requestAnimationFrame(loop);
  checkViewportZoomFrame();
  const now=performance.now();
  const dt=Math.min(0.05,(now-lastT)/1000); lastT=now;'''

assert old_loop_content in content, "old_loop_content not found!"
content = content.replace(old_loop_content, new_loop_content, 1)

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully applied Seeker Tap-to-Shoot and 1/4 Zoom Elimination fixes!")
