import re

HTML_PATH = r"D:/Projects/eraser_hideandseek/index.html"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update viewport meta tag
old_viewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">'
new_viewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover, shrink-to-fit=no">'
assert old_viewport in content, "Viewport tag not found!"
content = content.replace(old_viewport, new_viewport, 1)

# 2. Add position: fixed and safe touch styles to html, body & add reset zoom button CSS
old_body_style = 'html,body{width:100%;height:100%;overflow:hidden;background:#111;\n  font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic","Apple SD Gothic Neo",sans-serif;\n  font-weight:700;color:var(--ink);touch-action:none;user-select:none;-webkit-user-select:none;}'
new_body_style = 'html,body{position:fixed;inset:0;width:100%;height:100%;overflow:hidden;background:#111;\n  font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic","Apple SD Gothic Neo",sans-serif;\n  font-weight:700;color:var(--ink);touch-action:none;user-select:none;-webkit-user-select:none;\n  -webkit-touch-callout:none;-webkit-text-size-adjust:100%;}\n#btnResetZoom{position:fixed;right:14px;top:14px;z-index:45;font-size:12px;font-weight:800;\n  padding:7px 11px;border-radius:12px;background:rgba(255,248,231,.94);border:2px solid var(--ink);\n  box-shadow:2px 2px 0 rgba(0,0,0,.3);cursor:pointer;pointer-events:auto;}'

assert old_body_style in content, "Body style not found!"
content = content.replace(old_body_style, new_body_style, 1)

# 3. Add btnResetZoom button in HTML (near #mobileUI or #hud)
old_mobile_ui = '<div id="mobileUI" class="hidden">'
new_mobile_ui = '<button id="btnResetZoom" class="hidden" aria-label="화면 맞춤">🔄 화면 맞춤</button>\n<div id="mobileUI" class="hidden">'
assert old_mobile_ui in content, "#mobileUI not found!"
content = content.replace(old_mobile_ui, new_mobile_ui, 1)

# 4. Tag addBox and addCyl meshes with userData.solid
old_add_box = 'function addBox(w,h,d,mat,x,y,z,{collide=true,sample=true,ry=0}={}){\n  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);\n  m.position.set(x,y,z); if(ry)m.rotation.y=ry;\n  mapRoot.add(m);\n  if(collide){ m.updateMatrixWorld(); colliders.push(new THREE.Box3().setFromObject(m)); }\n  if(sample) samplables.push(m);\n  return m;\n}'
new_add_box = 'function addBox(w,h,d,mat,x,y,z,{collide=true,sample=true,ry=0}={}){\n  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);\n  m.position.set(x,y,z); if(ry)m.rotation.y=ry;\n  m.userData.solid=!!collide;\n  mapRoot.add(m);\n  if(collide){ m.updateMatrixWorld(); colliders.push(new THREE.Box3().setFromObject(m)); }\n  if(sample) samplables.push(m);\n  return m;\n}'
assert old_add_box in content, "addBox definition not found!"
content = content.replace(old_add_box, new_add_box, 1)

old_add_cyl = 'function addCyl(r,len,mat,x,y,z,{collide=true,sample=true,rz=0,rx=0,ry=0,rt=r}={}){\n  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,r,len,10),mat);\n  m.position.set(x,y,z); m.rotation.set(rx,ry,rz); mapRoot.add(m);\n  if(collide)addMeshCollider(m,0.015);\n  if(sample) samplables.push(m);\n  return m;\n}'
new_add_cyl = 'function addCyl(r,len,mat,x,y,z,{collide=true,sample=true,rz=0,rx=0,ry=0,rt=r}={}){\n  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,r,len,10),mat);\n  m.position.set(x,y,z); m.rotation.set(rx,ry,rz); m.userData.solid=!!collide; mapRoot.add(m);\n  if(collide)addMeshCollider(m,0.015);\n  if(sample) samplables.push(m);\n  return m;\n}'
assert old_add_cyl in content, "addCyl definition not found!"
content = content.replace(old_add_cyl, new_add_cyl, 1)

# 5. Fix cafeteria food mound height and soup surface collision
old_dish_base = 'addBox(4.0,0.75,3.6,lambert({color:base}),tx,5.45,czf,{collide:true,sample:true});       // 수북한 베이스(트레이 크기만 충돌)'
new_dish_base = 'addBox(4.0,1.25,3.6,lambert({color:base}),tx,5.7,czf,{collide:true,sample:true});        // 수북한 베이스(음식 덩어리 꼭대기까지 충돌)'
assert old_dish_base in content, "dish base not found!"
content = content.replace(old_dish_base, new_dish_base, 1)

old_soup = 'addCyl(2.9,0.4,lambert({color:0xe07f3e}),px,4.9,pz,{rt:2.9,collide:false,sample:true}); // 국물 표면'
new_soup = 'addCyl(2.9,0.4,lambert({color:0xe07f3e}),px,4.9,pz,{rt:2.9,collide:true,sample:true});  // 국물 표면(국물 속 파묻힘 방지 충돌)'
assert old_soup in content, "soup pot not found!"
content = content.replace(old_soup, new_soup, 1)

# 6. Update isJudgeBlocked to ignore non-solid props
old_judge_blocked = '''function isJudgeBlocked(targetPoint,targetDistance){
  _judgeDir.copy(targetPoint).sub(camera.position);
  const d=_judgeDir.length();
  if(d<=0.001)return false;
  _judgeDir.normalize();
  occlusionRay.set(camera.position,_judgeDir);
  occlusionRay.near=0.08;
  occlusionRay.far=Math.max(0.08,Math.min(targetDistance,d)-0.08);
  const obstacles=occlusionRay.intersectObjects(samplables,false);
  return obstacles.length>0;
}'''

new_judge_blocked = '''function isJudgeBlocked(targetPoint,targetDistance){
  _judgeDir.copy(targetPoint).sub(camera.position);
  const d=_judgeDir.length();
  if(d<=0.001)return false;
  _judgeDir.normalize();
  occlusionRay.set(camera.position,_judgeDir);
  occlusionRay.near=0.08;
  occlusionRay.far=Math.max(0.08,Math.min(targetDistance,d)-0.08);
  const obstacles=occlusionRay.intersectObjects(samplables,false);
  // 충돌체(solid)가 없는 장식 오브젝트(음식 덩어리, 고명 등)는 시야 차폐물에서 제외
  const solidObstacles=obstacles.filter(hit=>hit.object.userData.solid!==false);
  return solidObstacles.length>0;
}'''
assert old_judge_blocked in content, "isJudgeBlocked not found!"
content = content.replace(old_judge_blocked, new_judge_blocked, 1)

# 7. Add iOS Safari gesture & double-tap zoom prevention & viewport reset logic
ios_patch = '''
/* ── iPad / iOS Safari 제스처 줌 및 더블 탭 확대 방지 ── */
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
}
'''

# Place this patch right before updateMobileButtons or inside input section
anchor = '/* ── 모바일 ── */'
assert anchor in content, "Anchor not found!"
content = content.replace(anchor, ios_patch + '\n' + anchor, 1)

# In updateMobileButtons, toggle btnResetZoom visibility
old_mbtn_fn = 'function updateMobileButtons(){\n  if(!IS_TOUCH)return;'
new_mbtn_fn = 'function updateMobileButtons(){\n  if(!IS_TOUCH)return;\n  $("btnResetZoom")?.classList.toggle("hidden", G.screen!=="GAME"||G.mirror);'
assert old_mbtn_fn in content, "updateMobileButtons not found!"
content = content.replace(old_mbtn_fn, new_mbtn_fn, 1)

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully applied all patches to index.html!")
