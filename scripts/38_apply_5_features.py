import re

HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add CSS for Danger Vignette, Ghost Quest Box, PC Spoit, and Award Badges
css_insert = '''
/* ===== 신규 기능 5종 스타일 ===== */
#dangerVignette{position:fixed;inset:0;pointer-events:none;z-index:28;transition:box-shadow .15s ease-out;}
#dangerVignette.hidden{display:none;}
#ghostQuestBox{position:fixed;top:14px;right:120px;z-index:40;font-size:13px;font-weight:800;
  color:#fff;background:rgba(20,30,45,.85);padding:7px 14px;border-radius:12px;border:2px solid rgba(255,255,255,.6);
  text-shadow:1px 1px 0 #000;pointer-events:none;}
#ghostQuestBox.hidden{display:none;}
#pcSpoitBtn{position:fixed;left:14px;top:56px;z-index:42;font-size:13px;font-weight:800;
  padding:8px 14px;border-radius:12px;background:rgba(255,248,231,.95);border:3px solid var(--ink);
  box-shadow:2px 2px 0 rgba(0,0,0,.25);cursor:pointer;pointer-events:auto;transition:background .12s;}
#pcSpoitBtn.active{background:var(--yellow);}
#pcSpoitBtn.hidden{display:none;}
.awardGrid{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:12px 0 6px;}
.awardCard{background:#fff;border:2px solid var(--ink);border-radius:12px;padding:8px 12px;
  display:flex;align-items:center;gap:7px;box-shadow:2px 2px 0 rgba(0,0,0,.2);text-align:left;}
.awardCard .ico{font-size:22px;}
.awardCard .info{display:flex;flex-direction:column;line-height:1.2;}
.awardCard .title{font-size:11px;color:#777;font-weight:700;}
.awardCard .name{font-size:14px;color:var(--ink);font-weight:900;}
'''

style_end_tag = '</style>'
assert style_end_tag in content, "</style> not found!"
content = content.replace(style_end_tag, css_insert + '\n' + style_end_tag, 1)

# 2. Add HTML elements: #dangerVignette, #ghostQuestBox, #pcSpoitBtn
html_elements = '''
<!-- 술래 접근 붉은 테두리 경고 (무음) -->
<div id="dangerVignette" class="hidden"></div>
<!-- 유령(탈락 학생) 지우개 가루 청소 퀘스트 HUD -->
<div id="ghostQuestBox" class="hidden">🧹 지우개 가루 청소: <span id="ghostCrumbCount">0</span>개</div>
<!-- 크롬북/웨일북 전용 PC 온스크린 스포이드 버튼 -->
<button id="pcSpoitBtn" class="hidden" title="스포이드 (단축키: Q)">💧 스포이드 (Q)</button>
'''
hud_tag = '<div id="hud" class="hidden">'
assert hud_tag in content, '<div id="hud" class="hidden"> not found!'
content = content.replace(hud_tag, html_elements + '\n' + hud_tag, 1)

# 3. Add JS functions: updateDangerVignette, ghost crumb quest, PC Spoit, room cleanup, and awards
js_code = '''
/* ================= 신규 기능: 술래 접근 무음 비주얼 경고 ================= */
let dangerVignetteTime = 0;
function updateDangerVignette(dt){
  const el = $("dangerVignette");
  if(!el) return;
  const isHider = (G.screen === "GAME" && G.role === "hider" && !G.found && G.phase === "SEEK" && !G.mirror);
  if(!isHider){
    el.classList.add("hidden");
    return;
  }
  let minSeekerDist = Infinity;
  remotes.forEach(r=>{
    if(r.info && r.info.role === "seeker" && r.fairy && r.fairy.group){
      const d = G.pos.distanceTo(r.fairy.group.position);
      if(d < minSeekerDist) minSeekerDist = d;
    }
  });
  if(minSeekerDist <= 12){
    if(minSeekerDist <= 7) G.dangerTime = (G.dangerTime || 0) + dt;
    dangerVignetteTime += dt;
    const closeness = clamp(1 - (minSeekerDist - 2.5) / 9.5, 0, 1);
    const pulseFreq = lerp(4, 12, closeness);
    const pulse = 0.5 + 0.5 * Math.sin(dangerVignetteTime * pulseFreq);
    const alpha = lerp(0.3, 0.75, closeness) * (0.6 + 0.4 * pulse);
    const spread = Math.round(lerp(25, 75, closeness));
    el.style.boxShadow = `inset 0 0 ${spread}px rgba(230,69,69,${alpha.toFixed(3)})`;
    el.classList.remove("hidden");
  }else{
    el.classList.add("hidden");
  }
}

/* ================= 신규 기능: 유령(탈락 학생) 지우개 가루 청소 퀘스트 ================= */
let ghostCrumbs = [];
const CRUMB_GEO = new THREE.DodecahedronGeometry(0.32);
const CRUMB_MAT = new THREE.MeshBasicMaterial({color: 0xffe27a});

function spawnGhostCrumbs(){
  clearGhostCrumbs();
  for(let i=0; i<14; i++){
    const mesh = new THREE.Mesh(CRUMB_GEO, CRUMB_MAT);
    const x = rand(-ROOM_W*0.42, ROOM_W*0.42);
    const z = rand(-ROOM_D*0.42, ROOM_D*0.42);
    const y = rand(0.6, 4.2);
    mesh.position.set(x, y, z);
    mapRoot.add(mesh);
    ghostCrumbs.push({mesh, x, y, z, baseRot: rand(1.5, 3.5)});
  }
}

function clearGhostCrumbs(){
  ghostCrumbs.forEach(c=>{ if(c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh); });
  ghostCrumbs = [];
}

function updateGhostCrumbs(dt){
  const isGhost = (G.screen === "GAME" && G.role === "ghost" && G.phase === "SEEK");
  const qBox = $("ghostQuestBox");
  if(qBox) qBox.classList.toggle("hidden", !isGhost);
  if(!isGhost){
    if(ghostCrumbs.length) ghostCrumbs.forEach(c=>{ if(c.mesh) c.mesh.visible = false; });
    return;
  }
  if(ghostCrumbs.length === 0) spawnGhostCrumbs();

  ghostCrumbs.forEach(c=>{
    if(!c.mesh) return;
    c.mesh.visible = true;
    c.mesh.rotation.y += c.baseRot * dt;
    c.mesh.rotation.x += dt;
    if(G.pos.distanceTo(c.mesh.position) < 1.4){
      burst(c.mesh.position.clone(), "#F5C518", 8, 2, 0.4, true, 0.6);
      c.mesh.parent.remove(c.mesh);
      c.mesh = null;
      G.crumbsCollected = (G.crumbsCollected || 0) + 1;
      const cntEl = $("ghostCrumbCount");
      if(cntEl) cntEl.textContent = G.crumbsCollected;
      Audio2.sfxRefill();
      if(G.crumbsCollected % 5 === 0) toast(`✨ 지우개 가루 ${G.crumbsCollected}개 청소 완료! (학급 청결도 UP)`);
      setTimeout(()=>{
        if(G.role === "ghost" && G.phase === "SEEK"){
          const m = new THREE.Mesh(CRUMB_GEO, CRUMB_MAT);
          m.position.set(rand(-ROOM_W*0.42, ROOM_W*0.42), rand(0.6, 4.2), rand(-ROOM_D*0.42, ROOM_D*0.42));
          mapRoot.add(m);
          c.mesh = m;
        }
      }, 3000);
    }
  });
}

/* ================= 신규 기능: 크롬북/웨일북 PC 스포이드 토글 ================= */
function toggleSpoitMode(){
  spoitMode = !spoitMode;
  $("pcSpoitBtn")?.classList.toggle("active", spoitMode);
  $("btnSpoit")?.style.setProperty("background", spoitMode ? "var(--yellow)" : "");
  toast(spoitMode ? "💧 스포이트: 교실의 원하는 물건을 클릭하세요 (단축키: Q)" : "스포이트를 취소했어요");
}
$("pcSpoitBtn").onclick = toggleSpoitMode;
'''

# Place this code before main loop or before updateHUD
main_loop_anchor = '/* ================= 메인 루프 ================= */'
assert main_loop_anchor in content, "Main loop anchor not found!"
content = content.replace(main_loop_anchor, js_code + '\n' + main_loop_anchor, 1)

# 4. In keydown, add KeyQ shortcut for Spoit
old_keydown = 'if(e.code==="KeyE")setMirror(!G.mirror);'
new_keydown = 'if(e.code==="KeyE")setMirror(!G.mirror);\n  if(e.code==="KeyQ"&&G.role==="hider"&&!G.found)toggleSpoitMode();'
assert old_keydown in content, "KeyE keydown not found!"
content = content.replace(old_keydown, new_keydown, 1)

# 5. In loop(), call updateDangerVignette(dt) and updateGhostCrumbs(dt)
old_loop_updates = 'updateRemotes(dt);updateParticles(dt);updatePencil(dt);updateHUD();'
new_loop_updates = 'updateRemotes(dt);updateParticles(dt);updatePencil(dt);updateHUD();updateDangerVignette(dt);updateGhostCrumbs(dt);'
assert old_loop_updates in content, "loop updates not found!"
content = content.replace(old_loop_updates, new_loop_updates, 1)

# 6. In updateHUD(), update pcSpoitBtn visibility
old_gauge_box = '$("gaugeBox").style.visibility=(G.role==="hider"&&(G.lobbyPractice||G.phase==="PAINT"||G.phase==="SEEK"||Net.mode==="practice"))?"visible":"hidden";'
new_gauge_box = '''$("gaugeBox").style.visibility=(G.role==="hider"&&(G.lobbyPractice||G.phase==="PAINT"||G.phase==="SEEK"||Net.mode==="practice"))?"visible":"hidden";
  const showPcSpoit = (!IS_TOUCH && G.role==="hider" && !G.found && (G.phase==="PAINT"||G.phase==="SEEK"||G.lobbyPractice||Net.mode==="practice") && !G.mirror);
  $("pcSpoitBtn")?.classList.toggle("hidden", !showPcSpoit);'''
assert old_gauge_box in content, "gaugeBox visibility not found!"
content = content.replace(old_gauge_box, new_gauge_box, 1)

# 7. Add Firebase Room Auto-Cleanup (TTL) in Net
old_create_room = 'this.attach(); this.startHostLoop();\n    return true;'
new_create_room = '''this.attach(); this.startHostLoop();
    this.cleanupOldRooms();
    return true;'''
assert old_create_room in content, "createRoom end not found!"
content = content.replace(old_create_room, new_create_room, 1)

# Add cleanupOldRooms method to Net
old_net_anchor = 'async initFirebase(serverIdx=1){'
new_net_cleanup = '''async cleanupOldRooms(){
    if(!this.db) return;
    const {ref,get,remove}=this.fb;
    try{
      const snap=await get(ref(this.db,"rooms"));
      if(!snap.exists()) return;
      const rooms=snap.val();
      const now=Date.now();
      for(const rCode of Object.keys(rooms)){
        if(rCode===this.code) continue;
        const rData=rooms[rCode];
        const rMeta=rData?.meta;
        const rPresence=rData?.presence;
        const createdAt=rMeta?.createdAt||0;
        const hasOnline=rPresence && Object.values(rPresence).some(p=>p&&p.online);
        // 2시간 이상 지난 방 또는 참가자 전원 퇴장 방 자동 삭제
        if((createdAt>0 && now-createdAt > 7200000) || (!hasOnline && (!createdAt || now-createdAt > 1800000))){
          remove(ref(this.db,`rooms/${rCode}`)).catch(()=>{});
        }
      }
    }catch(_e){}
  },
  async initFirebase(serverIdx=1){'''
assert old_net_anchor in content, "initFirebase anchor not found!"
content = content.replace(old_net_anchor, new_net_cleanup, 1)

# Also record createdAt: Date.now() when creating meta
old_meta_set = 'settings:{paintSec:60,seekSec:180},hostRole:"spectator",manualSeekers:null,mapId:"classroom"'
new_meta_set = 'settings:{paintSec:60,seekSec:180},hostRole:"spectator",manualSeekers:null,mapId:"classroom",createdAt:Date.now()'
assert old_meta_set in content, "meta set not found!"
content = content.replace(old_meta_set, new_meta_set, 1)

# 8. Enrich Result MVP Badges in enterResult()
old_result_body = '''    if(survivors.length===0&&hiders.length){
      best=hiders.reduce((a,b)=>((a[1].foundAt||0)>(b[1].foundAt||0)?a:b))[1].nick;
    }else if(survivors.length) best=survivors.join(", ");
    if(best) body+=`<span class="best">🏆 최고의 지우개: ${best}</span>`;
  }
  $("resultBody").innerHTML=body||"수고했어요!";'''

new_result_body = '''    if(survivors.length===0&&hiders.length){
      best=hiders.reduce((a,b)=>((a[1].foundAt||0)>(b[1].foundAt||0)?a:b))[1].nick;
    }else if(survivors.length) best=survivors.join(", ");
    
    // 다채로운 학급 칭찬 뱃지 (MVP Awards)
    body+=`<div class="awardGrid">`;
    if(best) body+=`<div class="awardCard"><span class="ico">🏆</span><div class="info"><span class="title">카멜레온 상</span><span class="name">${best}</span></div></div>`;
    
    // 끈기왕 상 (위기 탈출 넘버원)
    if(G.dangerTime && G.dangerTime > 1.5){
      body+=`<div class="awardCard"><span class="ico">⏱️</span><div class="info"><span class="title">끈기왕 상 (위기탈출)</span><span class="name">${G.nick||"나"}</span></div></div>`;
    }
    // 청소 요정 상 (지우개 가루 수집)
    if(G.crumbsCollected && G.crumbsCollected > 0){
      body+=`<div class="awardCard"><span class="ico">🧹</span><div class="info"><span class="title">청소 요정 상</span><span class="name">${G.nick||"나"} (${G.crumbsCollected}개)</span></div></div>`;
    }
    // 매의 눈 상 (술래 칭찬)
    if(seekWin){
      const seekers=Object.values(Net.players||{}).filter(p=>p.role==="seeker").map(p=>p.nick);
      if(seekers.length) body+=`<div class="awardCard"><span class="ico">🦅</span><div class="info"><span class="title">매의 눈 상</span><span class="name">${seekers.join(", ")}</span></div></div>`;
    }
    body+=`</div>`;
  }
  $("resultBody").innerHTML=body||"수고했어요!";'''

assert old_result_body in content, "resultBody logic not found!"
content = content.replace(old_result_body, new_result_body, 1)

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully applied all 5 major enhancements to index.html!")
