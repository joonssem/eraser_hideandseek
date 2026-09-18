import sys
import re

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

HTML_PATH = "index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    content = f.read()

print("Original size:", len(content))

# 1. Update makePencilCanvas to accept isRed parameter
old_make_pencil = '''function makePencilCanvas(){ // 술래(연필) 고정 텍스처
  const c=document.createElement("canvas");c.width=256;c.height=256;
  const g=c.getContext("2d");
  g.fillStyle="#F5C518";g.fillRect(0,0,256,256);
  const stripe=(x0,y0,x1,y1)=>{ const w=x1-x0,h=y1-y0;
    g.fillStyle="#F5C518";g.fillRect(x0,y0,w,h);
    g.fillStyle="#e8b90f";for(let s=0;s<w;s+=14)g.fillRect(x0+s,y0,6,h); // 육각 줄
    g.fillStyle="#ff9fc0";g.fillRect(x0,y0,w,h*0.18);                    // 분홍 지우개 머리
    g.fillStyle="#c9ced6";g.fillRect(x0,y0+h*0.18,w,h*0.07);             // 은색 띠
  };
  stripe(0,0,128,128); stripe(128,0,256,128);      // 앞·뒤
  stripe(0,64,64,128); stripe(64,64,128,128);      // 옆 (v.25-.5 → y64-128 구간 절반씩)
  g.fillStyle="#ff9fc0";g.fillRect(128,64,64,64);  // 윗면 = 지우개
  g.fillStyle="#e8b90f";g.fillRect(192,64,64,64);  // 아랫면
  g.fillStyle="#F5C518";g.fillRect(0,192,128,64);  // 팔
  g.fillStyle="#e8b90f";g.fillRect(128,192,128,64);// 다리
  // 눈
  g.fillStyle="#2B2B2B";g.beginPath();g.arc(46,34,6,0,7);g.fill();
  g.beginPath();g.arc(82,34,6,0,7);g.fill();
  return c;
}'''

new_make_pencil = '''function makePencilCanvas(isRed=false){ // 술래(연필 / 빨간색연필) 고정 텍스처
  const c=document.createElement("canvas");c.width=256;c.height=256;
  const g=c.getContext("2d");
  const mainColor = isRed ? "#E64545" : "#F5C518";
  const darkColor = isRed ? "#b82626" : "#e8b90f";
  g.fillStyle=mainColor;g.fillRect(0,0,256,256);
  const stripe=(x0,y0,x1,y1)=>{ const w=x1-x0,h=y1-y0;
    g.fillStyle=mainColor;g.fillRect(x0,y0,w,h);
    g.fillStyle=darkColor;for(let s=0;s<w;s+=14)g.fillRect(x0+s,y0,6,h); // 육각 줄
    g.fillStyle=isRed?"#ff8080":"#ff9fc0";g.fillRect(x0,y0,w,h*0.18);   // 머리
    g.fillStyle="#c9ced6";g.fillRect(x0,y0+h*0.18,w,h*0.07);             // 은색 띠
  };
  stripe(0,0,128,128); stripe(128,0,256,128);      // 앞·뒤
  stripe(0,64,64,128); stripe(64,64,128,128);      // 옆
  g.fillStyle=isRed?"#ff8080":"#ff9fc0";g.fillRect(128,64,64,64);
  g.fillStyle=darkColor;g.fillRect(192,64,64,64);
  g.fillStyle=mainColor;g.fillRect(0,192,128,64);
  g.fillStyle=darkColor;g.fillRect(128,192,128,64);
  // 눈
  g.fillStyle="#2B2B2B";g.beginPath();g.arc(46,34,6,0,7);g.fill();
  g.beginPath();g.arc(82,34,6,0,7);g.fill();
  return c;
}'''

assert old_make_pencil in content, "old_make_pencil not found!"
content = content.replace(old_make_pencil, new_make_pencil, 1)

# 2. Add setPencilColor function and reference in pencilFP
old_pencil_fp = '''/* 술래 1인칭 연필 소품 */
const pencilFP=(()=>{
  const gp=new THREE.Group();
  const bodyMat=lambert({color:0xF5C518,flatShading:true});
  gp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,2.6,6),bodyMat));
  const wood=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.16,0.5,6),lambert({color:0xE8CFA0,flatShading:true}));
  wood.position.y=-1.55; gp.add(wood);
  const tip=new THREE.Mesh(new THREE.CylinderGeometry(0.001,0.05,0.22,6),lambert({color:0x333333}));
  tip.position.y=-1.85; gp.add(tip);
  const ferrule=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,0.16,6),lambert({color:0xe6e6ec,flatShading:true}));
  ferrule.position.y=1.22; gp.add(ferrule);
  const eras=new THREE.Mesh(new THREE.CylinderGeometry(0.155,0.175,0.32,6),lambert({color:0xff9fc0,flatShading:true}));
  eras.position.y=1.46; gp.add(eras);
  gp.rotation.set(1.25,0,-0.35);
  gp.position.set(0.55,-0.5,-1.1);
  gp.visible=false; camera.add(gp);
  return gp;
})();'''

new_pencil_fp = '''/* 술래 1인칭 연필 소품 */
let _pencilBodyMesh=null, _pencilTipMesh=null;
const pencilFP=(()=>{
  const gp=new THREE.Group();
  const bodyMat=lambert({color:0xF5C518,flatShading:true});
  _pencilBodyMesh=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,2.6,6),bodyMat);
  gp.add(_pencilBodyMesh);
  const wood=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.16,0.5,6),lambert({color:0xE8CFA0,flatShading:true}));
  wood.position.y=-1.55; gp.add(wood);
  _pencilTipMesh=new THREE.Mesh(new THREE.CylinderGeometry(0.001,0.05,0.22,6),lambert({color:0x333333}));
  _pencilTipMesh.position.y=-1.85; gp.add(_pencilTipMesh);
  const ferrule=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,0.16,6),lambert({color:0xe6e6ec,flatShading:true}));
  ferrule.position.y=1.22; gp.add(ferrule);
  const eras=new THREE.Mesh(new THREE.CylinderGeometry(0.155,0.175,0.32,6),lambert({color:0xff9fc0,flatShading:true}));
  eras.position.y=1.46; gp.add(eras);
  gp.rotation.set(1.25,0,-0.35);
  gp.position.set(0.55,-0.5,-1.1);
  gp.visible=false; camera.add(gp);
  return gp;
})();

function setPencilColor(isRed=false){
  if(_pencilBodyMesh) _pencilBodyMesh.material.color.setHex(isRed ? 0xE64545 : 0xF5C518);
  if(_pencilTipMesh) _pencilTipMesh.material.color.setHex(isRed ? 0xE64545 : 0x333333);
}'''

assert old_pencil_fp in content, "old_pencil_fp not found!"
content = content.replace(old_pencil_fp, new_pencil_fp, 1)

# 3. Add convertRemoteToPencil function
old_ensure_remote = '''    remotes.set(uid,r);
  }
  r.info=info;'''

new_ensure_remote = '''    remotes.set(uid,r);
  }
  // 감염 모드: 지우개였던 원격 플레이어가 seeker로 바뀌면 빨간 연필로 변환
  if(info.role==="seeker" && r.info && r.info.role==="hider"){
    convertRemoteToPencil(uid, true);
  }
  r.info=info;'''

assert old_ensure_remote in content, "old_ensure_remote not found!"
content = content.replace(old_ensure_remote, new_ensure_remote, 1)

# Also define convertRemoteToPencil right above ensureRemote
remote_pencil_fn = '''
function convertRemoteToPencil(uid, isRed=true){
  const r=remotes.get(uid);
  if(!r||!r.fairy||!r.fairy.group)return;
  const oldPos=r.fairy.group.position.clone();
  const oldRot=r.fairy.group.rotation.y;
  scene.remove(r.fairy.group);
  const canvas=makePencilCanvas(isRed);
  const newFairy=buildFairy(canvas, true);
  newFairy.group.userData.baseY=0;
  newFairy.group.position.copy(oldPos);
  newFairy.group.rotation.y=oldRot;
  newFairy.group.visible=true;
  scene.add(newFairy.group);
  r.fairy=newFairy;
  setFairyNameLabel(newFairy.nameLabel, (r.info.nick||"연필") + (isRed?" ✏️":" ✏️"));
}
'''
assert "function ensureRemote(uid,info){" in content, "ensureRemote anchor not found!"
content = content.replace("function ensureRemote(uid,info){", remote_pencil_fn + "\nfunction ensureRemote(uid,info){", 1)

# 4. Update onSomeoneFound for Infection Mode
old_someone_found = '''  if(uid===Net.uid){ G.found=true;G.spectating=false;setMirror(false);
    showRoleCard("😵 들켰다!","유령이 되어 구경하자!");
    G.role="ghost";syncLocalFairy();updateSpectatorButton();updateMobileButtons();
  }'''

new_someone_found = '''  const isInfection = (((Net.meta||{}).settings||{}).gameMode === "infection");
  if(isInfection){
    convertRemoteToPencil(uid, true);
  }
  if(uid===Net.uid){
    G.found=true; G.spectating=false; setMirror(false);
    if(isInfection){
      // 🧟 술래 증식 감염 모드!
      G.role="seeker";
      G.isSubSeeker=true;
      setPencilColor(true); // 빨간 색연필
      showRoleCard("✏️ 빨간 색연필로 변신!", "친구들을 함께 찾아내자!");
      Audio2.sfxFanfare();
      syncLocalFairy();
      updateMobileButtons();
      if(Net.mode==="online" && Net.db){
        Net.fb.update(Net.fb.ref(Net.db, `rooms/${Net.code}/players/${Net.uid}`), {role:"seeker", isSubSeeker:true}).catch(()=>{});
      }
    }else{
      showRoleCard("😵 들켰다!","유령이 되어 구경하자!");
      G.role="ghost";
      syncLocalFairy();
      updateSpectatorButton();
      updateMobileButtons();
    }
  }'''

assert old_someone_found in content, "old_someone_found not found!"
content = content.replace(old_someone_found, new_someone_found, 1)

# 5. Add Lobby Settings Checkbox & Teacher Panel Toggle for Infection Mode
old_settings_box = '''    <span id="seekSecVal" class="settingsVal">3분</span>
  </div>
</div>'''

new_settings_box = '''    <span id="seekSecVal" class="settingsVal">3분</span>
  </div>
  <div class="settingsRow" style="justify-content:space-between;padding-top:4px;">
    <label style="cursor:pointer;" for="chkInfectionMode">🧟 술래 증식 모드</label>
    <input type="checkbox" id="chkInfectionMode" checked style="width:20px;height:20px;cursor:pointer;">
  </div>
</div>'''

assert old_settings_box in content, "old_settings_box not found!"
content = content.replace(old_settings_box, new_settings_box, 1)

# Hook chkInfectionMode in lobby setup
old_bind_settings = '''$("seekSecSlider").oninput=()=>{
    const v=parseInt($("seekSecSlider").value,10);
    $("seekSecVal").textContent=fmtSec(v);
    Net.updateSettings({seekSec:v});
  };'''

new_bind_settings = '''$("seekSecSlider").oninput=()=>{
    const v=parseInt($("seekSecSlider").value,10);
    $("seekSecVal").textContent=fmtSec(v);
    Net.updateSettings({seekSec:v});
  };
  $("chkInfectionMode").onchange=()=>{
    const on=$("chkInfectionMode").checked;
    Net.updateSettings({gameMode:on?"infection":"normal"});
    toast(on?"🧟 술래 증식(감염) 모드를 켰어요":"기본 숨바꼭질 모드로 바꿨어요");
  };'''

assert old_bind_settings in content, "old_bind_settings not found!"
content = content.replace(old_bind_settings, new_bind_settings, 1)

# Update syncSettingsUI
old_sync_settings = '''  const seekSec=settings.seekSec||180;
  $("seekSecSlider").value=seekSec;
  $("seekSecVal").textContent=fmtSec(seekSec);'''

new_sync_settings = '''  const seekSec=settings.seekSec||180;
  $("seekSecSlider").value=seekSec;
  $("seekSecVal").textContent=fmtSec(seekSec);
  const isInfect=(settings.gameMode!=="normal"); // 기본값 감염 모드 켜짐
  $("chkInfectionMode").checked=isInfect;'''

assert old_sync_settings in content, "old_sync_settings not found!"
content = content.replace(old_sync_settings, new_sync_settings, 1)

# Reset pencil color at enterPaint
old_enter_paint_init = '''function enterPaint(){
  resetViewportZoom();
  Audio2.resume();
  showScreen("GAME");'''

new_enter_paint_init = '''function enterPaint(){
  resetViewportZoom();
  setPencilColor(false); // 노란 연필 초기화
  G.isSubSeeker=false;
  Audio2.resume();
  showScreen("GAME");'''

assert old_enter_paint_init in content, "old_enter_paint_init not found!"
content = content.replace(old_enter_paint_init, new_enter_paint_init, 1)

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully applied Step 2: Infection Mode (술래 증식 감염 모드) to index.html!")
