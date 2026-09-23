/**
 * 🧪 scripts/check_av_room.mjs
 *
 * 시청각실(av_room.js) 모듈 전수 자동화 검증 스크립트
 *
 * [검증 항목]
 * 1. 4종 생명주기 export 검사 (AV_ROOM_MAP, buildAvRoom, updateAvRoomGimmicks, cleanupAvRoom)
 * 2. setWallHeight(30) 계약 이행 검사
 * 3. 지우개 스폰 20개 및 술래 스폰 6개 수량 및 y=0 바닥 배치 검사
 * 4. 26개 스폰 좌표와 전체 AABB 충돌체(AABB Box3) 간 XZ 겹침 전수 검사 (0건 검증)
 * 5. 좌석 정확히 60석 (6행 x 10석) 모델링 및 6단 계단 구조 검증
 * 6. 스크린 뒤 1.8-unit 은신 통로 개방 및 비봉쇄 검증
 * 7. 프레임 기반 빔프로젝터 갱신(dt) 및 cleanupAvRoom 리소스 해제 검증
 * 8. 시청각실 3회 연속 빌드 & 클린업 반복 재빌드 시 멱등성 및 안정성 검증
 * 9. 전체 6개 맵(미술실, 체육관, 음악실, 보건실, 돌봄교실, 시청각실) 상호 교차 전환 시뮬레이션
 */

import {
  ART_ROOM_MAP,
  buildArtRoom,
  updateArtRoomGimmicks,
  cleanupArtRoom
} from "../maps/art_room.js";

import {
  GYMNASIUM_MAP,
  buildGymnasium,
  updateGymnasiumGimmicks,
  cleanupGymnasium
} from "../maps/gymnasium.js";

import {
  MUSIC_ROOM_MAP,
  buildMusicRoom,
  updateMusicRoomGimmicks,
  cleanupMusicRoom
} from "../maps/music_room.js";

import {
  HEALTH_OFFICE_MAP,
  buildHealthOffice,
  updateHealthOfficeGimmicks,
  cleanupHealthOffice
} from "../maps/health_office.js";

import {
  CARE_ROOM_MAP,
  buildCareRoom,
  updateCareRoomGimmicks,
  cleanupCareRoom
} from "../maps/care_room.js";

import {
  AV_ROOM_MAP,
  buildAvRoom,
  updateAvRoomGimmicks,
  cleanupAvRoom
} from "../maps/av_room.js";

// ─────────────────────────────────────────────────────────────────
// 경량 THREE 모의 객체 (Node.js 순수 환경 독립 실행 보장)
// ─────────────────────────────────────────────────────────────────
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
  }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  distanceTo(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

class Box3 {
  constructor(min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity)) {
    this.min = min;
    this.max = max;
  }
  setFromObject(m) {
    if (m.geometry && m.geometry.type === "BoxGeometry") {
      const { w, h, d } = m.geometry;
      const x = m.position.x;
      const y = m.position.y;
      const z = m.position.z;
      this.min = new Vector3(x - w / 2, y - h / 2, z - d / 2);
      this.max = new Vector3(x + w / 2, y + h / 2, z + d / 2);
    } else if (m.geometry && m.geometry.type === "CylinderGeometry") {
      const { r, len } = m.geometry;
      const x = m.position.x;
      const y = m.position.y;
      const z = m.position.z;
      this.min = new Vector3(x - r, y - len / 2, z - r);
      this.max = new Vector3(x + r, y + len / 2, z + r);
    }
    return this;
  }
  getSize(target) {
    target.x = this.max.x - this.min.x;
    target.y = this.max.y - this.min.y;
    target.z = this.max.z - this.min.z;
    return target;
  }
  containsPointXZ(px, pz, pad = 0.0) {
    return (
      px >= (this.min.x - pad) && px <= (this.max.x + pad) &&
      pz >= (this.min.z - pad) && pz <= (this.max.z + pad)
    );
  }
}

class Mesh {
  constructor(geometry, material) {
    this.geometry = geometry;
    this.material = material;
    this.position = new Vector3();
    this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
    this.userData = {};
  }
  updateMatrixWorld() {}
}

class Group {
  constructor() {
    this.children = [];
    this.position = new Vector3();
    this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
  }
  add(child) { this.children.push(child); }
  remove(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
  }
}

const mockTHREE = {
  Vector3,
  Box3,
  Mesh,
  Group,
  BoxGeometry: class { constructor(w, h, d) { this.type = "BoxGeometry"; this.w = w; this.h = h; this.d = d; } dispose() {} },
  CylinderGeometry: class { constructor(rt, r, len, seg, hSeg, openEnded) { this.type = "CylinderGeometry"; this.rt = rt; this.r = r; this.len = len; } dispose() {} },
  PlaneGeometry: class { constructor(w, d) { this.type = "PlaneGeometry"; this.w = w; this.d = d; } dispose() {} },
  SphereGeometry: class { constructor(r, w, h) { this.type = "SphereGeometry"; this.r = r; } dispose() {} },
  RingGeometry: class { constructor() {} dispose() {} },
  ConeGeometry: class { constructor() {} dispose() {} },
  TorusGeometry: class { constructor() {} dispose() {} },
  MeshLambertMaterial: class { constructor(opt) { Object.assign(this, opt); this.disposed = false; } dispose() { this.disposed = true; } },
  MeshBasicMaterial: class { constructor(opt) { Object.assign(this, opt); this.disposed = false; } dispose() { this.disposed = true; } },
  CanvasTexture: class { constructor() {} },
  DoubleSide: 2,
  SRGBColorSpace: "srgb",
  RepeatWrapping: 1000
};

function mockCanvasTex(w, h, drawFn) {
  const mockCtx = {
    fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", textAlign: "",
    fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
    stroke() {}, fill() {}, arc() {}, ellipse() {}, fillText() {}
  };
  drawFn(mockCtx, w, h);
  return new mockTHREE.CanvasTexture();
}

function createTestContext() {
  const mapRoot = new mockTHREE.Group();
  const ROOM_W = 120;
  const ROOM_D = 90;
  let currentWallH = 30;

  const samplables = [];
  const colliders = [];
  const refillZones = [];
  const hiderSpawns = [];
  const seekerSpawns = [];

  function lambert(opt) {
    return new mockTHREE.MeshLambertMaterial(opt);
  }

  function addBox(w, h, d, mat, x, y, z, { collide = true, sample = true, ry = 0 } = {}) {
    const m = new mockTHREE.Mesh(new mockTHREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.userData.solid = !!collide;
    mapRoot.add(m);
    if (collide) {
      colliders.push(new mockTHREE.Box3().setFromObject(m));
    }
    if (sample) samplables.push(m);
    return m;
  }

  function addCyl(r, len, mat, x, y, z, { collide = true, sample = true, rz = 0, rx = 0, ry = 0, rt = r } = {}) {
    const m = new mockTHREE.Mesh(new mockTHREE.CylinderGeometry(rt, r, len, 12), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.userData.solid = !!collide;
    mapRoot.add(m);
    if (collide) {
      const box = new mockTHREE.Box3().setFromObject(m);
      const size = new mockTHREE.Vector3();
      box.getSize(size);
      const minThickness = 0.6;
      ["x", "y", "z"].forEach(ax => {
        if (size[ax] < minThickness) {
          const c = (box.min[ax] + box.max[ax]) / 2;
          box.min[ax] = c - minThickness / 2;
          box.max[ax] = c + minThickness / 2;
        }
      });
      colliders.push(box);
    }
    if (sample) samplables.push(m);
    return m;
  }

  function addAABBCollider(cx, cy, cz, w, h, d, pad = 0.02) {
    const min = new mockTHREE.Vector3(cx - w / 2 - pad, cy - h / 2 - pad, cz - d / 2 - pad);
    const max = new mockTHREE.Vector3(cx + w / 2 + pad, cy + h / 2 + pad, cz + d / 2 + pad);
    const b = new mockTHREE.Box3(min, max);
    colliders.push(b);
    return b;
  }

  function buildRoomShell(floorMat, wallColor, ceilColor, skirtColor) {
    const floor = new mockTHREE.Mesh(new mockTHREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
    mapRoot.add(floor);
    samplables.push(floor);

    // 4면 외벽 충돌체
    addBox(ROOM_W, currentWallH, 2, lambert({ color: wallColor }), 0, currentWallH / 2, -ROOM_D / 2 - 1, { collide: true, sample: false });
    addBox(ROOM_W, currentWallH, 2, lambert({ color: wallColor }), 0, currentWallH / 2, ROOM_D / 2 + 1, { collide: true, sample: false });
    addBox(2, currentWallH, ROOM_D, lambert({ color: wallColor }), -ROOM_W / 2 - 1, currentWallH / 2, 0, { collide: true, sample: false });
    addBox(2, currentWallH, ROOM_D, lambert({ color: wallColor }), ROOM_W / 2 + 1, currentWallH / 2, 0, { collide: true, sample: false });
  }

  return {
    ctx: {
      THREE: mockTHREE,
      mapRoot,
      ROOM_W,
      ROOM_D,
      WALL_H: currentWallH,
      setWallHeight: (h) => { currentWallH = h; },
      addBox,
      addCyl,
      canvasTex: mockCanvasTex,
      lambert,
      addAABBCollider,
      buildRoomShell,
      samplables,
      colliders,
      refillZones,
      hiderSpawns,
      seekerSpawns
    },
    getWallH: () => currentWallH,
    mapRoot,
    colliders,
    samplables,
    refillZones,
    hiderSpawns,
    seekerSpawns
  };
}

let testCount = 0;
let passCount = 0;

function assert(condition, message) {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

console.log("================================================================================");
console.log("  🎬 시청각실(av_room.js) 모듈 전수 자동화 검증");
console.log("================================================================================");

// ─────────────────────────────────────────────────────────────────
// 1. 메타데이터 및 인터페이스 검사
// ─────────────────────────────────────────────────────────────────
console.log("\n[1] 메타데이터 및 인터페이스 검사");
assert(typeof AV_ROOM_MAP === "object" && AV_ROOM_MAP !== null, "AV_ROOM_MAP 메타데이터 export 확인");
assert(AV_ROOM_MAP.id === "av_room", "맵 ID('av_room') 확인");
assert(AV_ROOM_MAP.name === "시청각실" && AV_ROOM_MAP.icon === "🎬", "이름('시청각실') 및 아이콘('🎬') 확인");
assert(typeof buildAvRoom === "function", "buildAvRoom 함수 export 확인");
assert(typeof updateAvRoomGimmicks === "function", "updateAvRoomGimmicks 함수 export 확인");
assert(typeof cleanupAvRoom === "function", "cleanupAvRoom 함수 export 확인");

// ─────────────────────────────────────────────────────────────────
// 2. 공간 수치 및 컨텍스트 계약 검사
// ─────────────────────────────────────────────────────────────────
console.log("\n[2] 공간 수치 및 컨텍스트 계약 검사");
const t1 = createTestContext();
buildAvRoom(t1.ctx);

assert(t1.getWallH() === 30, `setWallHeight(30) 계약 이행 확인 (실제: ${t1.getWallH()})`);
assert(t1.hiderSpawns.length === 20, `지우개(요정) 스폰 수 20개 확인 (실제: ${t1.hiderSpawns.length})`);
assert(t1.seekerSpawns.length === 6, `술래 스폰 수 6개 확인 (실제: ${t1.seekerSpawns.length})`);
assert(t1.refillZones.length === 1, `음향조정실 리필존 등록 확인 (${t1.refillZones[0]?.label}, r=${t1.refillZones[0]?.r})`);

const allHidersOnFloor = t1.hiderSpawns.every(sp => sp.y === 0);
const allSeekersOnFloor = t1.seekerSpawns.every(sp => sp.y === 0);
assert(allHidersOnFloor, "모든 지우개 스폰의 y 좌표가 0 (바닥 위치)");
assert(allSeekersOnFloor, "모든 술래 스폰의 y 좌표가 0 (바닥 위치)");

// ─────────────────────────────────────────────────────────────────
// 3. 26개 스폰 좌표와 전체 AABB 충돌체 간 XZ 겹침 전수 검사
// ─────────────────────────────────────────────────────────────────
console.log("\n[3] 스폰-AABB XZ 겹침 전수 검사");
console.log(`  • 총 등록 충돌체(AABB): ${t1.colliders.length}개`);
console.log(`  • 검사 대상 스폰: 총 26개 (지우개 20 + 술래 6)`);

let collisionOverlapCount = 0;
const overlapDetails = [];

t1.hiderSpawns.forEach((sp, i) => {
  t1.colliders.forEach((box, j) => {
    if (box.containsPointXZ(sp.x, sp.z)) {
      collisionOverlapCount++;
      overlapDetails.push(`지우개 #${i + 1} (${sp.x}, ${sp.z}) vs 충돌체 #${j} [${box.min.x.toFixed(1)}, ${box.max.x.toFixed(1)}] x [${box.min.z.toFixed(1)}, ${box.max.z.toFixed(1)}]`);
    }
  });
});

t1.seekerSpawns.forEach((sp, i) => {
  t1.colliders.forEach((box, j) => {
    if (box.containsPointXZ(sp.x, sp.z)) {
      collisionOverlapCount++;
      overlapDetails.push(`술래 #${i + 1} (${sp.x}, ${sp.z}) vs 충돌체 #${j} [${box.min.x.toFixed(1)}, ${box.max.x.toFixed(1)}] x [${box.min.z.toFixed(1)}, ${box.max.z.toFixed(1)}]`);
    }
  });
});

if (overlapDetails.length > 0) {
  overlapDetails.forEach(d => console.error("    ⚠️ " + d));
}

assert(collisionOverlapCount === 0, `스폰 좌표와 AABB 충돌체 간 XZ 겹침 0건 검증 (검출: ${collisionOverlapCount}건)`);

// ─────────────────────────────────────────────────────────────────
// 4. 좌석 60석(6행 x 10석) 및 6단 계단 구조 검증
// ─────────────────────────────────────────────────────────────────
console.log("\n[4] 좌석 60석 및 6단 계단 구조 검증");
const backrests = t1.samplables.filter(m => m.geometry?.w === 4.2 && m.geometry?.d === 0.6);
const cushions = t1.samplables.filter(m => m.geometry?.w === 3.8 && m.geometry?.d === 0.7);
assert(backrests.length === 60, `좌석 등받이 정확히 60개 확인 (실제: ${backrests.length})`);
assert(cushions.length === 60, `접힌 방석 정확히 60개 확인 (실제: ${cushions.length})`);

const tierColliders = t1.colliders.filter(b => {
  const sz = new Vector3();
  b.getSize(sz);
  return Math.abs(sz.x - 104) < 1.0;
});
assert(tierColliders.length === 5, `스타디움 5개 단차 발판 충돌체(104 폭) 확인 (실제: ${tierColliders.length})`);

// ─────────────────────────────────────────────────────────────────
// 5. 스크린 뒤 1.8-unit 은신 통로 개방 및 비봉쇄 검증
// ─────────────────────────────────────────────────────────────────
console.log("\n[5] 스크린 뒤 1.8-unit 은신 통로 검증");
let screenTunnelBlocked = false;
t1.colliders.forEach(box => {
  if (box.containsPointXZ(0, -44.0) && box.min.y <= 3.0 && box.max.y >= 3.0) {
    screenTunnelBlocked = true;
  }
});
assert(!screenTunnelBlocked, "스크린 뒤 은신 통로(Z=-44.0)가 AABB 충돌체로 봉쇄되지 않고 개방됨");

// ─────────────────────────────────────────────────────────────────
// 6. 프레임 갱신 및 cleanup 무결성 검증
// ─────────────────────────────────────────────────────────────────
console.log("\n[6] 프레임 갱신 및 리소스 정리(cleanupAvRoom) 검증");
assert(t1.mapRoot.children.length > 50, `충분한 3D 메쉬 생성 확인 (메쉬 수: ${t1.mapRoot.children.length})`);

let updateError = false;
try {
  updateAvRoomGimmicks(t1.ctx, 0.016);
  updateAvRoomGimmicks(t1.ctx, 1.0);
} catch (e) {
  updateError = true;
}
assert(!updateError, "updateAvRoomGimmicks 함수 예외 없이 정상 실행");

cleanupAvRoom(t1.ctx);
assert(t1.mapRoot.children.find(ch => ch.material?.opacity !== undefined) === undefined, "cleanup 후 빔프로젝터 광선 메쉬 제거 확인");

let afterCleanupUpdateErr = false;
try {
  updateAvRoomGimmicks(t1.ctx, 0.016);
} catch (e) {
  afterCleanupUpdateErr = true;
}
assert(!afterCleanupUpdateErr, "cleanup 후 update 호출 시 에러 없이 안전하게 무시됨");

// ─────────────────────────────────────────────────────────────────
// 7. 3회 연속 반복 재빌드 및 cleanup 멱등성 검증
// ─────────────────────────────────────────────────────────────────
console.log("\n[7] 3회 연속 반복 재빌드 및 cleanup 멱등성 검증");
const rebuildStats = [];
for (let loop = 1; loop <= 3; loop++) {
  const tLoop = createTestContext();
  buildAvRoom(tLoop.ctx);
  updateAvRoomGimmicks(tLoop.ctx, 0.016);
  rebuildStats.push({
    wallH: tLoop.getWallH(),
    hiders: tLoop.hiderSpawns.length,
    seekers: tLoop.seekerSpawns.length,
    colliders: tLoop.colliders.length,
    samplables: tLoop.samplables.length
  });
  cleanupAvRoom(tLoop.ctx);
}

const isConsistent = rebuildStats.every(s =>
  s.wallH === rebuildStats[0].wallH &&
  s.hiders === rebuildStats[0].hiders &&
  s.seekers === rebuildStats[0].seekers &&
  s.colliders === rebuildStats[0].colliders &&
  s.samplables === rebuildStats[0].samplables
);
assert(isConsistent, `3회 반복 재빌드 수치 완전 일치 (Wall: ${rebuildStats[0].wallH}, H: ${rebuildStats[0].hiders}, S: ${rebuildStats[0].seekers}, C: ${rebuildStats[0].colliders}, Samp: ${rebuildStats[0].samplables})`);

// ─────────────────────────────────────────────────────────────────
// 8. 전체 6개 맵 상호 교차 전환 12단계 시뮬레이션
// ─────────────────────────────────────────────────────────────────
console.log("\n[8] 전체 6개 맵 교차 전환 시뮬레이션");
const mapRegistry = [
  { name: "미술실", build: buildArtRoom, update: updateArtRoomGimmicks, cleanup: cleanupArtRoom },
  { name: "체육관", build: buildGymnasium, update: updateGymnasiumGimmicks, cleanup: cleanupGymnasium },
  { name: "음악실", build: buildMusicRoom, update: updateMusicRoomGimmicks, cleanup: cleanupMusicRoom },
  { name: "보건실", build: buildHealthOffice, update: updateHealthOfficeGimmicks, cleanup: cleanupHealthOffice },
  { name: "돌봄교실", build: buildCareRoom, update: updateCareRoomGimmicks, cleanup: cleanupCareRoom },
  { name: "시청각실", build: buildAvRoom, update: updateAvRoomGimmicks, cleanup: cleanupAvRoom }
];

let transitionSuccess = true;
const transCtx = createTestContext();
try {
  for (let step = 0; step < 12; step++) {
    const cur = mapRegistry[step % mapRegistry.length];
    const prev = mapRegistry[(step + mapRegistry.length - 1) % mapRegistry.length];
    if (step > 0) prev.cleanup(transCtx.ctx);
    cur.build(transCtx.ctx);
    cur.update(transCtx.ctx, 0.016);
  }
  mapRegistry[(11) % mapRegistry.length].cleanup(transCtx.ctx);
} catch (e) {
  console.error("  ⚠️ 맵 교차 전환 중 예외 발생:", e);
  transitionSuccess = false;
}
assert(transitionSuccess, "6개 맵 상호 교차 전환 12단계 시뮬레이션 성공 (이전 맵 정리 및 새 맵 정상 빌드)");

console.log("\n================================================================================");
console.log(`  최종 결과: ${passCount}건 통과, ${testCount - passCount}건 실패`);
console.log("================================================================================");
if (passCount === testCount) {
  console.log("🎉 시청각실(av_room.js) 모든 요구사항 및 검증 기준 100% 충족!\n");
}
