import sys
import re

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

HTML_PATH = "index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    content = f.read()

print("Original size:", len(content))

# 1. Add sfxSqueak to Audio2
old_audio = '''  sfxStep(){ this.tone(150+Math.random()*40,0.05,"sine",0.12); },'''

new_audio = '''  sfxStep(){ this.tone(150+Math.random()*40,0.05,"sine",0.12); },
  sfxSqueak(dist=0){
    if(!this.ctx||this.muted)return;
    const d=Math.min(dist,38);
    const vol=Math.max(0.04, 0.46*(1-d/38));
    // 귀여운 지우개 삑삑이 (950Hz -> 1550Hz 급상승 후 1100Hz 소멸)
    this.tone(950, 0.12, "sine", vol, 0, 1550);
    this.tone(1550, 0.14, "sine", vol*0.78, 0.08, 1050);
  },'''

assert old_audio in content, "old_audio not found!"
content = content.replace(old_audio, new_audio, 1)

# 2. Add btnTaunt CSS & HTML
old_css_anchor = '''#btnResetZoom{position:fixed;left:14px;top:14px;z-index:99999;'''
new_taunt_css = '''#btnTaunt{width:62px;height:62px;left:18px;bottom:80px;background:rgba(255,235,160,.95);
  font-size:13px;font-weight:900;border:3px solid var(--ink);border-radius:50%;box-shadow:2px 2px 0 rgba(0,0,0,.3);
  display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1;cursor:pointer;pointer-events:auto;}
#btnTaunt.hidden{display:none !important;}
#btnTaunt.cd{opacity:.4;filter:grayscale(1);pointer-events:none;}
''' + old_css_anchor

assert old_css_anchor in content, "old_css_anchor not found!"
content = content.replace(old_css_anchor, new_taunt_css, 1)

# Add btnTaunt HTML inside mobileUI
old_mobile_ui = '''<button id="btnResetZoom" class="hidden" aria-label="화면 맞춤">🔄 화면 맞춤</button>
<div id="mobileUI" class="hidden">'''

new_mobile_ui = '''<button id="btnResetZoom" class="hidden" aria-label="화면 맞춤">🔄 화면 맞춤</button>
<div id="mobileUI" class="hidden">
  <div id="btnTaunt" class="mbtn hidden" aria-label="삑삑 도발">🎵<br>삑!</div>'''

assert old_mobile_ui in content, "old_mobile_ui not found!"
content = content.replace(old_mobile_ui, new_mobile_ui, 1)

# 3. Add Squeak & Taunt Logic functions
squeak_logic = '''
/* ================= 메챠 카멜레온 오마주: 1단계 지우개 삑삑이(Auto-Whistle) & 도발 ================= */
let _lastSqueakMark = -1;
let _tauntCdUntil = 0;
const _tempScrVec = new THREE.Vector3();

function triggerSqueakAtFairy(pos, isSelf=false, distance=0){
  burst(pos, "#FFF8E7", 7, 1.8, 0.55, true, 0.45);
  burst(pos, "#F5C518", 4, 2.2, 0.45, false, 0.3);
  Audio2.sfxSqueak(distance);
  // 머리 위 3D 월드 좌표 -> 2D 화면 변환 텍스트
  _tempScrVec.copy(pos); _tempScrVec.y += 1.4;
  _tempScrVec.project(camera);
  if(_tempScrVec.z < 1){
    const sx = (_tempScrVec.x * 0.5 + 0.5) * innerWidth;
    const sy = (-(_tempScrVec.y * 0.5) + 0.5) * innerHeight;
    popText("🎵 삑!", sx, sy, "#FFF8E7");
  }
}

// 자동 삑삑이 검사 (남은 시간 기준 30초마다)
function updateAutoSqueak(remainMs){
  if(G.screen !== "GAME" || G.phase !== "SEEK") {
    _lastSqueakMark = -1;
    return;
  }
  // 30초(30000ms) 단위 구간 인덱스
  const sec = Math.max(0, Math.floor(remainMs / 1000));
  // 90초, 60초, 30초, 10초 시점에 트리거
  let mark = -1;
  if(sec <= 10 && sec > 8) mark = 10;
  else if(sec <= 30 && sec > 28) mark = 30;
  else if(sec <= 60 && sec > 58) mark = 60;
  else if(sec <= 90 && sec > 88) mark = 90;

  if(mark > 0 && _lastSqueakMark !== mark){
    _lastSqueakMark = mark;
    doAllHidersSqueak();
  }
}

function doAllHidersSqueak(){
  Audio2.resume();
  let minSeekerDist = Infinity;
  const isSeeker = (G.role === "seeker");
  const myPos = G.pos;

  // 1) 내 자신이 살아있는 숨은 지우개인 경우
  if(G.role === "hider" && !G.found && G.screen === "GAME"){
    triggerSqueakAtFairy(myPos, true, 0);
    toast("🤫 삑! 내 지우개에서 소리가 났어요!");
    shake();
  }

  // 2) 원격 지우개들
  remotes.forEach((r, uid)=>{
    if(r.info.role === "hider" && !r.info.found && r.fairy && r.fairy.group){
      const p = r.fairy.group.position;
      const d = camera.position.distanceTo(p);
      if(d < minSeekerDist) minSeekerDist = d;
      triggerSqueakAtFairy(p, false, d);
    }
  });

  // 술래 화면 알림
  if(isSeeker){
    if(minSeekerDist < 40){
      toast("👂 삑! 어디선가 지우개 소리가 들렸어요!");
    }
  }
}

// 수동 도발 (Manual Taunt)
function doManualTaunt(){
  if(G.role !== "hider" || G.found || G.phase !== "SEEK" || G.screen !== "GAME") return;
  const now = performance.now();
  if(now < _tauntCdUntil){
    toast("🎵 도발 쿨다운 중이에요...");
    return;
  }
  _tauntCdUntil = now + 8000; // 8초 쿨다운
  Audio2.resume();
  triggerSqueakAtFairy(G.pos, true, 0);

  // 주변 술래 탐지 (14m 이내에 술래가 있으면 아슬아슬 성공)
  let nearSeeker = false;
  remotes.forEach(r=>{
    if(r.info.role === "seeker" && r.fairy && r.fairy.group){
      if(camera.position.distanceTo(r.fairy.group.position) < 14) nearSeeker = true;
    }
  });
  if(nearSeeker){
    toast("🔥 대담한 도발 성공! 술래를 놀렸어요! (+50점)");
    Audio2.sfxRefill();
    G.tauntCount = (G.tauntCount || 0) + 1;
  }else{
    toast("🎵 삑! (술래를 유인했어요)");
  }
}
'''

anchor_input = '''/* ================= 입력 ================= */'''
assert anchor_input in content, "anchor_input not found!"
content = content.replace(anchor_input, squeak_logic + '\n' + anchor_input, 1)

# 4. Bind Taunt Button and KeyT
old_key_handler = '''if(e.code==="KeyQ"&&G.role==="hider"&&!G.found)toggleSpoitMode();'''
new_key_handler = '''if(e.code==="KeyQ"&&G.role==="hider"&&!G.found)toggleSpoitMode();
  if(e.code==="KeyT"&&!e.repeat)doManualTaunt();'''

assert old_key_handler in content, "old_key_handler not found!"
content = content.replace(old_key_handler, new_key_handler, 1)

# Update updateMobileButtons for btnTaunt
old_mobile_update = '''$("btnSpoit").classList.toggle("hidden",!(hidePaint));'''
new_mobile_update = '''$("btnSpoit").classList.toggle("hidden",!(hidePaint));
  const showTaunt = (G.role==="hider" && !G.found && G.phase==="SEEK" && G.screen==="GAME" && !G.mirror);
  $("btnTaunt")?.classList.toggle("hidden", !showTaunt);'''

assert old_mobile_update in content, "old_mobile_update not found!"
content = content.replace(old_mobile_update, new_mobile_update, 1)

# Bind btnTaunt click/pointerdown
old_bind_buttons = '''$("btnSpoit").onpointerdown=e=>{'''
new_bind_buttons = '''$("btnTaunt").onpointerdown=e=>{
  e.preventDefault(); e.stopPropagation();
  doManualTaunt();
};
$("btnSpoit").onpointerdown=e=>{'''

assert old_bind_buttons in content, "old_bind_buttons not found!"
content = content.replace(old_bind_buttons, new_bind_buttons, 1)

# 5. Connect updateAutoSqueak inside updateHUD
old_hud_timer = '''    if(G.phase==="SEEK"&&Music.mode==="SEEK") Music.up=(remain<=30000&&remain>0);'''
new_hud_timer = '''    if(G.phase==="SEEK"&&Music.mode==="SEEK") Music.up=(remain<=30000&&remain>0);
    if(G.phase==="SEEK") updateAutoSqueak(remain);'''

assert old_hud_timer in content, "old_hud_timer not found!"
content = content.replace(old_hud_timer, new_hud_timer, 1)

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully applied Step 1: Auto-Whistle (지우개 삑삑이) and Manual Taunt System!")
