import sys
import re

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

HTML_PATH = "index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    content = f.read()

print("Original content size:", len(content))

# 1. Update CSS: Add comprehensive touch-action: none and no-select rules
old_touch_css = '''#mobileUI{position:fixed;inset:0;z-index:35;pointer-events:none;}'''

new_touch_css = '''/* 모바일 터치/확대 방지 절대 규칙 */
#blockOverlay, #caseGame, #caseGameArea, .crumb,
#mobileUI, #mobileUI *, #joyBase, #joyKnob, .mbtn,
#btnResetZoom, canvas, .screen {
  touch-action: none !important;
  -webkit-touch-callout: none !important;
  -webkit-user-select: none !important;
  user-select: none !important;
}
#mobileUI{position:fixed;inset:0;z-index:35;pointer-events:none;}'''

assert old_touch_css in content, "old_touch_css not found!"
content = content.replace(old_touch_css, new_touch_css, 1)

# 2. Fix btnJudge onpointerdown to add e.preventDefault() and e.stopPropagation()
old_btn_judge = '''$("btnJudge").onpointerdown=()=>{tryJudge();Audio2.resume();};'''
new_btn_judge = '''$("btnJudge").onpointerdown=e=>{
  e.preventDefault(); e.stopPropagation();
  tryJudge(); Audio2.resume();
};'''

assert old_btn_judge in content, "old_btn_judge not found!"
content = content.replace(old_btn_judge, new_btn_judge, 1)

# 3. Fix btnSpoit, btnMirror, btnMirrorDone, pose buttons to add e.preventDefault()
old_other_buttons = '''$("btnMirror").onpointerdown=()=>{setMirror(true);Audio2.resume();};
$("btnMirrorDone").onpointerdown=()=>setMirror(false);
$("btnSpoit").onpointerdown=e=>{
  e.stopPropagation();Audio2.resume();
  spoitMode=!spoitMode;
  $("btnSpoit").style.background=spoitMode?"var(--yellow)":"";
  toast(spoitMode?"💧 스포이트: 원하는 교실 부분을 터치하세요":"스포이트를 취소했어요");
};
$("btnPaintHold").onpointerdown=()=>{}; // 색칠 모드에서는 캐릭터를 직접 터치해 칠합니다.
$("btnFillAll").onclick=()=>{
  Audio2.resume();
  fillWholeFairy();
  // 몸 전체 칠하기 뒤에도 색칠 모드를 유지해 세부 색칠을 이어갈 수 있습니다.
  mirrorDrag=null;
  mirrorLast=null;
  lastPaintPx=null;
  syncLocalFairy();
};
document.querySelectorAll(".poseCol .mbtn").forEach(b=>b.onpointerdown=()=>setPose(b.dataset.pose));'''

new_other_buttons = '''$("btnMirror").onpointerdown=e=>{
  e.preventDefault(); e.stopPropagation();
  setMirror(true); Audio2.resume();
};
$("btnMirrorDone").onpointerdown=e=>{
  e.preventDefault(); e.stopPropagation();
  setMirror(false);
};
$("btnSpoit").onpointerdown=e=>{
  e.preventDefault(); e.stopPropagation(); Audio2.resume();
  spoitMode=!spoitMode;
  $("btnSpoit").style.background=spoitMode?"var(--yellow)":"";
  toast(spoitMode?"💧 스포이트: 원하는 교실 부분을 터치하세요":"스포이트를 취소했어요");
};
$("btnPaintHold").onpointerdown=e=>{ e.preventDefault(); }; // 색칠 모드에서는 캐릭터를 직접 터치해 칠합니다.
$("btnFillAll").onclick=e=>{
  e.preventDefault(); Audio2.resume();
  fillWholeFairy();
  // 몸 전체 칠하기 뒤에도 색칠 모드를 유지해 세부 색칠을 이어갈 수 있습니다.
  mirrorDrag=null;
  mirrorLast=null;
  lastPaintPx=null;
  syncLocalFairy();
};
document.querySelectorAll(".poseCol .mbtn").forEach(b=>b.onpointerdown=e=>{
  e.preventDefault(); e.stopPropagation();
  setPose(b.dataset.pose);
});'''

assert old_other_buttons in content, "old_other_buttons not found!"
content = content.replace(old_other_buttons, new_other_buttons, 1)

# 4. Fix caseGame / crumb onpointerdown in spawnCrumb and caseGameArea
old_crumb_logic = '''  el.onpointerdown=e=>{
    e.stopPropagation(); if(popped)return; popped=true; clearTimeout(life);
    caseGameScore++; const sc=$("caseGameScore"); if(sc)sc.textContent="✨ "+caseGameScore;
    Audio2.resume(); Audio2.sfxRefill();
    el.classList.add("pop"); setTimeout(()=>{ if(el.isConnected)el.remove(); },160);
  };
  area.appendChild(el);'''

new_crumb_logic = '''  el.onpointerdown=e=>{
    e.preventDefault(); e.stopPropagation();
    if(popped)return; popped=true; clearTimeout(life);
    caseGameScore++; const sc=$("caseGameScore"); if(sc)sc.textContent="✨ "+caseGameScore;
    Audio2.resume(); Audio2.sfxRefill();
    el.classList.add("pop"); setTimeout(()=>{ if(el.isConnected)el.remove(); },160);
  };
  area.appendChild(el);'''

assert old_crumb_logic in content, "old_crumb_logic not found!"
content = content.replace(old_crumb_logic, new_crumb_logic, 1)

# Also guard caseGameArea from double tap zooms
old_start_case = '''function startCaseGame(){
  stopCaseGame();
  caseGameScore=0; const sc=$("caseGameScore"); if(sc)sc.textContent="✨ 0";
  caseGameTimer=setInterval(spawnCrumb,800);
}'''

new_start_case = '''function startCaseGame(){
  stopCaseGame();
  caseGameScore=0; const sc=$("caseGameScore"); if(sc)sc.textContent="✨ 0";
  const area=$("caseGameArea");
  if(area && !area._guarded){
    area._guarded=true;
    area.addEventListener("pointerdown", e=>{ e.preventDefault(); }, {passive:false});
    area.addEventListener("touchstart", e=>{ e.preventDefault(); }, {passive:false});
  }
  caseGameTimer=setInterval(spawnCrumb,800);
}'''

assert old_start_case in content, "old_start_case not found!"
content = content.replace(old_start_case, new_start_case, 1)

# 5. Upgrade resetViewportZoom with visualViewport watcher & Safari meta bounce trick
old_zoom_patch = '''/* ── iPad / iOS Safari 제스처 줌 및 더블 탭 확대 방지 ── */
document.addEventListener("gesturestart", e=>{e.preventDefault();}, {passive:false});
document.addEventListener("gesturechange", e=>{e.preventDefault();}, {passive:false});
document.addEventListener("gestureend", e=>{e.preventDefault();}, {passive:false});
document.addEventListener("touchmove", e=>{
  if(e.touches.length>1)e.preventDefault();
}, {passive:false});
let _lastTouchEndTime=0;
document.addEventListener("touchend", e=>{
  const now=Date.now();
  if(now-_lastTouchEndTime<=320){e.preventDefault();}
  _lastTouchEndTime=now;
}, {passive:false});
function resetViewportZoom(){
  window.scrollTo(0,0);
  document.body.scrollTop=0;
  document.documentElement.scrollTop=0;
  onResize();
}
document.addEventListener("focusout", ()=>setTimeout(resetViewportZoom,120));
const btnRZ=$("btnResetZoom");
if(btnRZ){
  btnRZ.onpointerdown=e=>{
    e.preventDefault();e.stopPropagation();
    resetViewportZoom();
    toast("화면 배율을 맞췄어요");
  };
}'''

new_zoom_patch = '''/* ── 모바일 / iPad Safari 화면 확대 절대 방지 및 자가 치유(Self-Healing) 시스템 ── */
// 1) 제스처(핀치 줌) 및 더블클릭/더블탭 전역 캡처 차단
window.addEventListener("dblclick", e=>{e.preventDefault();e.stopPropagation();}, {passive:false, capture:true});
window.addEventListener("wheel", e=>{if(e.ctrlKey)e.preventDefault();}, {passive:false});
["gesturestart","gesturechange","gestureend"].forEach(type=>{
  document.addEventListener(type, e=>{e.preventDefault();e.stopPropagation();}, {passive:false, capture:true});
});
document.addEventListener("touchmove", e=>{
  if(e.touches && e.touches.length>1)e.preventDefault();
}, {passive:false});
let _lastTouchEndTime=0;
document.addEventListener("touchend", e=>{
  const now=Date.now();
  if(now-_lastTouchEndTime<=320){e.preventDefault();}
  _lastTouchEndTime=now;
}, {passive:false});

// 2) 뷰포트 배율 복구 (iOS Safari 메타 태그 재설정 기법 포함)
let _zoomFixing=false;
function resetViewportZoom(){
  if(_zoomFixing)return;
  _zoomFixing=true;
  window.scrollTo(0,0);
  document.body.scrollTop=0;
  document.documentElement.scrollTop=0;
  
  // iOS Safari의 강제 줌 락을 푸는 메타태그 리바운스 트릭
  const vp=document.querySelector('meta[name="viewport"]');
  if(vp){
    const orig=vp.content;
    vp.content='width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover';
    setTimeout(()=>{
      vp.content=orig;
      _zoomFixing=false;
    }, 40);
  }else{
    _zoomFixing=false;
  }
  onResize();
}
window.resetViewportZoom = resetViewportZoom;

// 3) visualViewport 실시간 감시: 브라우저가 화면을 1%라도 확대하거나 스크롤하면 즉시 자동 원복
if(window.visualViewport){
  const checkZoom=()=>{
    if(window.visualViewport.scale>1.02 || window.visualViewport.offsetLeft>3 || window.visualViewport.offsetTop>3){
      resetViewportZoom();
    }
  };
  window.visualViewport.addEventListener("resize", checkZoom);
  window.visualViewport.addEventListener("scroll", checkZoom);
}

document.addEventListener("focusout", ()=>setTimeout(resetViewportZoom,120));
const btnRZ=$("btnResetZoom");
if(btnRZ){
  btnRZ.onpointerdown=e=>{
    e.preventDefault();e.stopPropagation();
    resetViewportZoom();
    toast("화면 배율을 맞췄어요");
  };
}'''

assert old_zoom_patch in content, "old_zoom_patch not found!"
content = content.replace(old_zoom_patch, new_zoom_patch, 1)

# 6. Auto reset zoom on phase changes: enterPaint, enterSeek, and showScreen
old_enter_paint_top = '''function enterPaint(){
  Audio2.resume();
  showScreen("GAME");'''

new_enter_paint_top = '''function enterPaint(){
  resetViewportZoom();
  Audio2.resume();
  showScreen("GAME");'''

assert old_enter_paint_top in content, "old_enter_paint_top not found!"
content = content.replace(old_enter_paint_top, new_enter_paint_top, 1)

old_enter_seek_top = '''function enterSeek(){
  Net.uploadTex(); // 안전망: 아직 안 올렸으면 즉시
  setMirror(false);
  stopCaseGame();'''

new_enter_seek_top = '''function enterSeek(){
  resetViewportZoom();
  resetMovementInputs();
  Net.uploadTex(); // 안전망: 아직 안 올렸으면 즉시
  setMirror(false);
  stopCaseGame();'''

assert old_enter_seek_top in content, "old_enter_seek_top not found!"
content = content.replace(old_enter_seek_top, new_enter_seek_top, 1)

# 7. Safe joystick touch coordinate calculation based on visualViewport
old_joy_hit = '''if(e.clientX<innerWidth*0.45&&joyId===null){'''
new_joy_hit = '''const effectiveWidth=(window.visualViewport?window.visualViewport.width:innerWidth);
  if(e.clientX<effectiveWidth*0.45&&joyId===null){'''

assert old_joy_hit in content, "old_joy_hit not found!"
content = content.replace(old_joy_hit, new_joy_hit, 1)

# 8. Add canvas pointerdown preventDefault for touch
old_canvas_pointerdown = '''renderer.domElement.addEventListener("pointerdown",e=>{
  if(!IS_TOUCH||G.screen!=="GAME")return;'''

new_canvas_pointerdown = '''renderer.domElement.addEventListener("pointerdown",e=>{
  if(!IS_TOUCH||G.screen!=="GAME")return;
  e.preventDefault();'''

assert old_canvas_pointerdown in content, "old_canvas_pointerdown not found!"
content = content.replace(old_canvas_pointerdown, new_canvas_pointerdown, 1)

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully applied comprehensive zoom lock & self-healing patch to index.html!")
