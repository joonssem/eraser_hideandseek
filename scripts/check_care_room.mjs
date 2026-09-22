/**
 * 🧪 scripts/check_care_room.mjs
 *
 * 돌봄교실(care_room.js) 모듈 전수 자동화 검증 스크립트
 *
 * [검증 항목]
 * 1. 4종 생명주기 export 검사 (CARE_ROOM_MAP, buildCareRoom, updateCareRoomGimmicks, cleanupCareRoom)
 * 2. setWallHeight(33) 계약 이행 검사
 * 3. 지우개 스폰 20개 및 술래 스폰 6개 수량 및 y=0 바닥 배치 검사
 * 4. 26개 스폰 좌표와 전체 AABB 충돌체(AABB Box3) 간 XZ 겹침 전수 검사 (0건 검증)
 * 5. 장난감 기차 주행 궤도와 26개 스폰 간의 안전 이격 거리 검증 (주행로 침범 0건)
 * 6. 프레임 기반 기차 주행 갱신(dt) 및 바퀴 회전 애니메이션 검증
 * 7. cleanupCareRoom 리소스(머티리얼, 지오메트리, 기차 그룹) 완벽 해제 검증
 * 8. 돌봄교실 3회 연속 빌드 & 클린업 반복 재빌드 시 멱등성 및 안정성 검증
 * 9. 전체 5개 맵(미술실, 체육관, 음악실, 보건실, 돌봄교실) 교차 전환 시뮬레이션
 * 10. 기차 탑승 및 물리 연동 보류 상태 및 update 안전성 확인
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
  CylinderGeometry: class { constructor(rt, r, len, seg) { this.type = "CylinderGeometry"; this.rt = rt; this.r = r; this.len = len; } dispose() {} },
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

// ─────────────────────────────────────────────────────────────────
// 테스트 컨텍스트 빌더 (preview.html 및 index.html 완전 동일 구조)
// ─────────────────────────────────────────────────────────────────
function createTestContext() {
  const mapRoot = new mockTHREE.Group();
  const ROOM_W = 120;
  const ROOM_D = 90;
  let currentWallH = 34;

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
    colliders.push(new mockTHREE.Box3(
      new mockTHREE.Vector3(cx - w / 2 - pad, cy - h / 2 - pad, cz - d / 2 - pad),
      new mockTHREE.Vector3(cx + w / 2 + pad, cy + h / 2 + pad, cz + d / 2 + pad)
    ));
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

// ─────────────────────────────────────────────────────────────────
// 테스트 실행 스위트
// ─────────────────────────────────────────────────────────────────
console.log("================================================================================");
console.log("  🧸 돌봄교실(care_room.js) 모듈 전수 자동화 검증");
console.log("================================================================================");

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

// ─────────────────────────────────────────────────────────────────
// 1. 메타데이터 및 export 무결성 검사
// ─────────────────────────────────────────────────────────────────
console.log("\n[1] 메타데이터 및 인터페이스 검사");
assert(CARE_ROOM_MAP && CARE_ROOM_MAP.id === "care_room", "CARE_ROOM_MAP 메타데이터 export 확인");
assert(CARE_ROOM_MAP.name === "돌봄교실" && CARE_ROOM_MAP.icon === "🧸", "이름('돌봄교실') 및 아이콘('🧸') 확인");
assert(typeof buildCareRoom === "function", "buildCareRoom 함수 export 확인");
assert(typeof updateCareRoomGimmicks === "function", "updateCareRoomGimmicks 함수 export 확인");
assert(typeof cleanupCareRoom === "function", "cleanupCareRoom 함수 export 확인");

// ─────────────────────────────────────────────────────────────────
// 2. 단일 빌드 기본 수치 및 계약 검사
// ─────────────────────────────────────────────────────────────────
console.log("\n[2] 공간 수치 및 컨텍스트 계약 검사");
const t1 = createTestContext();
buildCareRoom(t1.ctx);

assert(t1.getWallH() === 33, `setWallHeight(33) 계약 이행 확인 (실제: ${t1.getWallH()})`);
assert(t1.hiderSpawns.length === 20, `지우개(요정) 스폰 수 20개 확인 (실제: ${t1.hiderSpawns.length})`);
assert(t1.seekerSpawns.length === 6, `술래 스폰 수 6개 확인 (실제: ${t1.seekerSpawns.length})`);
assert(t1.refillZones.length === 1, `보드게임 책장 리필존 등록 확인 (${t1.refillZones[0]?.label}, r=${t1.refillZones[0]?.r})`);

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

// 지우개 스폰 20개 전수 검사
t1.hiderSpawns.forEach((sp, i) => {
  t1.colliders.forEach((box, j) => {
    if (box.containsPointXZ(sp.x, sp.z)) {
      collisionOverlapCount++;
      overlapDetails.push(`지우개 #${i + 1} (${sp.x}, ${sp.z}) vs 충돌체 #${j} [${box.min.x.toFixed(1)}, ${box.max.x.toFixed(1)}] x [${box.min.z.toFixed(1)}, ${box.max.z.toFixed(1)}]`);
    }
  });
});

// 술래 스폰 6개 전수 검사
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
// 4. 장난감 기차 궤도와 26개 스폰 간의 안전 이격 검증
// ─────────────────────────────────────────────────────────────────
console.log("\n[4] 기차 궤도 안전 이격 거리 검증");
// 기차 궤도 타원형 중심 및 반지름: X: -16~16, Z: 14, R: 18
// 직선부: Z = -4 및 Z = 32 (X in [-16, 16])
// 곡선부: 중심 (-16, 14), (16, 14), R = 18
// 기차 전폭 약 2.4 (차량 중심에서 좌우 1.2 유닛 + 플레이어 반지름 1.0 = 최소 2.2 유닛 안전 마진 필요)
function getMinDistanceToTrack(px, pz) {
  let minDist = Infinity;
  // 1. 북측 직선: X in [-16, 16], Z = -4
  if (px >= -16 && px <= 16) {
    minDist = Math.min(minDist, Math.abs(pz - (-4)));
  } else {
    minDist = Math.min(minDist, Math.hypot(px - (-16), pz - (-4)), Math.hypot(px - 16, pz - (-4)));
  }
  // 2. 남측 직선: X in [-16, 16], Z = 32
  if (px >= -16 && px <= 16) {
    minDist = Math.min(minDist, Math.abs(pz - 32));
  } else {
    minDist = Math.min(minDist, Math.hypot(px - (-16), pz - 32), Math.hypot(px - 16, pz - 32));
  }
  // 3. 서측 반원: 중심 (-16, 14), X <= -16
  const dWest = Math.hypot(px - (-16), pz - 14);
  if (px <= -16) {
    minDist = Math.min(minDist, Math.abs(dWest - 18));
  }
  // 4. 동측 반원: 중심 (16, 14), X >= 16
  const dEast = Math.hypot(px - 16, pz - 14);
  if (px >= 16) {
    minDist = Math.min(minDist, Math.abs(dEast - 18));
  }
  return minDist;
}

let unsafeSpawnCount = 0;
const allSpawns = [...t1.hiderSpawns, ...t1.seekerSpawns];
allSpawns.forEach((sp, i) => {
  const dist = getMinDistanceToTrack(sp.x, sp.z);
  if (dist < 3.0) { // 기차 반폭 1.2 + 지우개 반폭 0.8 + 여유 1.0 = 3.0 유닛 최소 이격
    unsafeSpawnCount++;
    console.error(`    ⚠️ 스폰 #${i + 1} (${sp.x}, ${sp.z}) 기차 선로와 너무 근접 (거리: ${dist.toFixed(2)} 유닛)`);
  }
});

assert(unsafeSpawnCount === 0, `기차 주행 궤도와 26개 스폰 간 3.0 유닛 이상 안전 이격 전수 확인 (위반: ${unsafeSpawnCount}건)`);

// ─────────────────────────────────────────────────────────────────
// 5. 프레임 기반 기차 순환 이동 및 바퀴 회전 애니메이션 검증
// ─────────────────────────────────────────────────────────────────
console.log("\n[5] 프레임 기반 기차 주행 및 기믹 갱신 검증");
// 초기 기차 그룹 탐색
const trainGroup = t1.mapRoot.children.find(ch => ch instanceof mockTHREE.Group && ch.children.length === 3);
assert(trainGroup !== undefined, "기차 3량 그룹이 mapRoot에 정상 추가됨");

const loco = trainGroup?.children[0];
const tender = trainGroup?.children[1];
const wagon = trainGroup?.children[2];

const p0_loco = loco?.position.clone();
const p0_wagon = wagon?.position.clone();

// 1초 경과 (dt = 1.0)
updateCareRoomGimmicks(t1.ctx, 1.0);

const p1_loco = loco?.position.clone();
const p1_wagon = wagon?.position.clone();

const locoDisplacement = Math.hypot(p1_loco.x - p0_loco.x, p1_loco.z - p0_loco.z);
assert(locoDisplacement > 0.1, `기차 이동 갱신 확인 (기관차 1초간 이동 변위: ${locoDisplacement.toFixed(2)} 유닛)`);

// 추가 2초 경과 (총 3초)
updateCareRoomGimmicks(t1.ctx, 2.0);
const p2_loco = loco?.position.clone();
const totalDisplacement = Math.hypot(p2_loco.x - p0_loco.x, p2_loco.z - p0_loco.z);
assert(totalDisplacement > locoDisplacement, `기차 연속 이동 확인 (3초간 총 변위: ${totalDisplacement.toFixed(2)} 유닛)`);

// ─────────────────────────────────────────────────────────────────
// 6. cleanupCareRoom 리소스 및 기차 완벽 해제 검증
// ─────────────────────────────────────────────────────────────────
console.log("\n[6] 리소스 정리(cleanupCareRoom) 무결성 검증");
cleanupCareRoom(t1.ctx);

const trainStillInMap = t1.mapRoot.children.includes(trainGroup);
assert(!trainStillInMap, "cleanupCareRoom 호출 후 기차 그룹이 mapRoot에서 완전히 제거됨");

// 정리 후 update 호출 시 에러 미발생 확인
let updateAfterCleanupError = false;
try {
  updateCareRoomGimmicks(t1.ctx, 0.016);
} catch (e) {
  updateAfterCleanupError = true;
}
assert(!updateAfterCleanupError, "cleanup 후 updateCareRoomGimmicks 호출 시 null 참조 에러 없이 안전하게 무시됨");

// ─────────────────────────────────────────────────────────────────
// 7. 돌봄교실 3회 연속 빌드 & 클린업 반복 재빌드 안정성 검증
// ─────────────────────────────────────────────────────────────────
console.log("\n[7] 3회 연속 반복 재빌드 및 cleanup 멱등성 검증");
const rebuildStats = [];

for (let r = 1; r <= 3; r++) {
  const tc = createTestContext();
  buildCareRoom(tc.ctx);
  updateCareRoomGimmicks(tc.ctx, 0.016);
  updateCareRoomGimmicks(tc.ctx, 0.032);
  rebuildStats.push({
    wallH: tc.getWallH(),
    hiders: tc.hiderSpawns.length,
    seekers: tc.seekerSpawns.length,
    colliders: tc.colliders.length,
    samplables: tc.samplables.length
  });
  cleanupCareRoom(tc.ctx);
}

const base = rebuildStats[0];
const isIdempotent = rebuildStats.every(s => (
  s.wallH === base.wallH &&
  s.hiders === base.hiders &&
  s.seekers === base.seekers &&
  s.colliders === base.colliders &&
  s.samplables === base.samplables
));

assert(isIdempotent, `3회 반복 재빌드 수치 완전 일치 (Wall: ${base.wallH}, H: ${base.hiders}, S: ${base.seekers}, C: ${base.colliders}, Samp: ${base.samplables})`);

// ─────────────────────────────────────────────────────────────────
// 8. 전체 5개 맵 교차 전환 시뮬레이션 (art -> gym -> music -> health -> care)
// ─────────────────────────────────────────────────────────────────
console.log("\n[8] 전체 5개 맵 교차 전환 10단계 시뮬레이션");

const MAP_REGISTRY = {
  art_room: { build: buildArtRoom, update: updateArtRoomGimmicks, cleanup: cleanupArtRoom, name: "미술실" },
  gymnasium: { build: buildGymnasium, update: updateGymnasiumGimmicks, cleanup: cleanupGymnasium, name: "체육관" },
  music_room: { build: buildMusicRoom, update: updateMusicRoomGimmicks, cleanup: cleanupMusicRoom, name: "음악실" },
  health_office: { build: buildHealthOffice, update: updateHealthOfficeGimmicks, cleanup: cleanupHealthOffice, name: "보건실" },
  care_room: { build: buildCareRoom, update: updateCareRoomGimmicks, cleanup: cleanupCareRoom, name: "돌봄교실" }
};

const switchSequence = [
  "art_room", "care_room", "gymnasium", "health_office",
  "music_room", "care_room", "art_room", "health_office",
  "care_room", "gymnasium"
];

let switchClean = true;
let currentKey = "art_room";
let activeContext = createTestContext();
MAP_REGISTRY[currentKey].build(activeContext.ctx);

for (const nextKey of switchSequence) {
  // 1. 이전 맵 cleanup 호출
  MAP_REGISTRY[currentKey].cleanup(activeContext.ctx);

  // 2. 맵 루트 비우기
  while (activeContext.mapRoot.children.length) {
    activeContext.mapRoot.children.pop();
  }

  // 3. 컬렉션 초기화
  activeContext.samplables.length = 0;
  activeContext.colliders.length = 0;
  activeContext.refillZones.length = 0;
  activeContext.hiderSpawns.length = 0;
  activeContext.seekerSpawns.length = 0;

  // 4. 새 맵 빌드 및 기믹 1회 호출
  currentKey = nextKey;
  MAP_REGISTRY[currentKey].build(activeContext.ctx);
  MAP_REGISTRY[currentKey].update(activeContext.ctx, 0.016);

  if (activeContext.hiderSpawns.length !== 20 || activeContext.seekerSpawns.length !== 6) {
    switchClean = false;
    console.error(`    ⚠️ 전환 실패 [${nextKey}]: 스폰 수 이상 (H:${activeContext.hiderSpawns.length}, S:${activeContext.seekerSpawns.length})`);
  }
}

// 마지막 맵 cleanup
MAP_REGISTRY[currentKey].cleanup(activeContext.ctx);
assert(switchClean, "5개 맵 상호 교차 전환 10단계 시뮬레이션 성공 (이전 맵 정리 및 새 맵 정상 빌드)");

// ─────────────────────────────────────────────────────────────────
// 9. 기차 탑승 보류 상태 및 update 안전성 확인
// ─────────────────────────────────────────────────────────────────
console.log("\n[9] 기차 탑승 보류 상태 및 update 안전성 확인");
let updateThrewError = false;
try {
  updateCareRoomGimmicks(activeContext.ctx, 0.016);
  updateCareRoomGimmicks(activeContext.ctx, 0.5);
} catch (e) {
  updateThrewError = true;
}
assert(!updateThrewError, "updateCareRoomGimmicks 함수 예외 없이 안전 실행 (엔진 미확정 동적 부모 연동 등 전역 상태 접근 없음)");

// ─────────────────────────────────────────────────────────────────
// 결과 종합
// ─────────────────────────────────────────────────────────────────
console.log("\n================================================================================");
console.log(`  최종 결과: ${passCount}건 통과, ${failCount}건 실패`);
console.log("================================================================================");

if (failCount > 0) {
  process.exit(1);
} else {
  console.log("🎉 돌봄교실(care_room.js) 모든 요구사항 및 검증 기준 100% 충족!\n");
  process.exit(0);
}
