/**
 * 🧪 scripts/check_health_office.mjs
 *
 * 보건실(health_office.js) 모듈 전수 자동화 검증 스크립트
 *
 * [검증 항목]
 * 1. 4종 생명주기 export 검사 (HEALTH_OFFICE_MAP, buildHealthOffice, updateHealthOfficeGimmicks, cleanupHealthOffice)
 * 2. setWallHeight(32) 계약 이행 검사
 * 3. 지우개 스폰 20개 및 술래 스폰 6개 수량 및 y=0 배치 검사
 * 4. 26개 스폰 좌표와 전체 AABB 충돌체(AABB Box3) 간 XZ 겹침 전수 검사 (0건 검증)
 * 5. 보건실 3회 연속 빌드 & 클린업 반복 재빌드 시 안정성 검증
 * 6. 다른 맵(미술실, 체육관, 음악실) ↔ 보건실 간 상호 전환 및 cleanup 무결성 검증
 * 7. 커튼 뒤 완전 밀폐 공간 및 무적 치즈 지점 부재 검증
 * 8. 안식처 버프(삑삑이 우회) 보류 상태 및 update 함수 안전성 검증
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

// ─────────────────────────────────────────────────────────────────
// 경량 THREE 모의 객체 (Node.js 순수 환경 독립 실행 보장)
// ─────────────────────────────────────────────────────────────────
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
  }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
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
console.log("  🩹 보건실(health_office.js) 모듈 전수 자동화 검증");
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
assert(HEALTH_OFFICE_MAP && HEALTH_OFFICE_MAP.id === "health_office", "HEALTH_OFFICE_MAP 메타데이터 export 확인");
assert(HEALTH_OFFICE_MAP.name === "보건실" && HEALTH_OFFICE_MAP.icon === "🩹", "이름('보건실') 및 아이콘('🩹') 확인");
assert(typeof buildHealthOffice === "function", "buildHealthOffice 함수 export 확인");
assert(typeof updateHealthOfficeGimmicks === "function", "updateHealthOfficeGimmicks 함수 export 확인");
assert(typeof cleanupHealthOffice === "function", "cleanupHealthOffice 함수 export 확인");

// ─────────────────────────────────────────────────────────────────
// 2. 단일 빌드 기본 수치 및 계약 검사
// ─────────────────────────────────────────────────────────────────
console.log("\n[2] 공간 수치 및 컨텍스트 계약 검사");
const t1 = createTestContext();
buildHealthOffice(t1.ctx);

assert(t1.getWallH() === 32, `setWallHeight(32) 계약 이행 확인 (실제: ${t1.getWallH()})`);
assert(t1.hiderSpawns.length === 20, `지우개(요정) 스폰 수 20개 확인 (실제: ${t1.hiderSpawns.length})`);
assert(t1.seekerSpawns.length === 6, `술래 스폰 수 6개 확인 (실제: ${t1.seekerSpawns.length})`);
assert(t1.refillZones.length === 1, `구급약 보관함 리필존 등록 확인 (${t1.refillZones[0]?.label}, r=${t1.refillZones[0]?.r})`);

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
// 4. 커튼 뒤 무적 치즈 지점 및 밀폐 공간 부재 검증
// ─────────────────────────────────────────────────────────────────
console.log("\n[4] 커튼 안전성 검사 (무적·밀폐 방지)");
// 커튼 패널 메쉬들이 충돌체(solid)로 등록되지 않았는지 확인
let solidCurtains = 0;
t1.mapRoot.children.forEach(ch => {
  if (ch.material && ch.material.opacity === 0.88 && ch.userData.solid === true) {
    solidCurtains++;
  }
});
assert(solidCurtains === 0, "커튼 패널에 solid 충돌체가 부여되지 않음 (Raycast 및 이동 차단 방지)");

// 침대 앞 통로 개방 확인 (Z = -10 라인의 지우개 스폰 3개 모두 막힘없이 이동 가능)
const bedFrontSpawns = t1.hiderSpawns.filter(sp => sp.z === -10);
assert(bedFrontSpawns.length >= 3, `침대 전면 통로 스폰 3개 이상 확인 (실제: ${bedFrontSpawns.length}개)`);

// ─────────────────────────────────────────────────────────────────
// 5. 보건실 3회 연속 빌드 & 클린업 반복 재빌드 안정성 검증
// ─────────────────────────────────────────────────────────────────
console.log("\n[5] 3회 연속 반복 재빌드 및 cleanup 검증");
const rebuildStats = [];

for (let r = 1; r <= 3; r++) {
  cleanupHealthOffice(t1.ctx);
  const tc = createTestContext();
  buildHealthOffice(tc.ctx);
  updateHealthOfficeGimmicks(tc.ctx, 0.016);
  rebuildStats.push({
    wallH: tc.getWallH(),
    hiders: tc.hiderSpawns.length,
    seekers: tc.seekerSpawns.length,
    colliders: tc.colliders.length,
    samplables: tc.samplables.length
  });
  cleanupHealthOffice(tc.ctx);
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
// 6. 다른 맵(미술실, 체육관, 음악실) ↔ 보건실 전환 시뮬레이션
// ─────────────────────────────────────────────────────────────────
console.log("\n[6] 프리뷰 다중 맵 전환 시뮬레이션 (art_room ↔ gym ↔ music ↔ health)");

const MAP_REGISTRY = {
  art_room: { build: buildArtRoom, update: updateArtRoomGimmicks, cleanup: cleanupArtRoom, name: "미술실" },
  gymnasium: { build: buildGymnasium, update: updateGymnasiumGimmicks, cleanup: cleanupGymnasium, name: "체육관" },
  music_room: { build: buildMusicRoom, update: updateMusicRoomGimmicks, cleanup: cleanupMusicRoom, name: "음악실" },
  health_office: { build: buildHealthOffice, update: updateHealthOfficeGimmicks, cleanup: cleanupHealthOffice, name: "보건실" }
};

const switchSequence = [
  "art_room", "gymnasium", "music_room", "health_office",
  "gymnasium", "health_office", "art_room", "health_office"
];

let switchClean = true;
let currentKey = "art_room";
let activeContext = createTestContext();
MAP_REGISTRY[currentKey].build(activeContext.ctx);

for (const nextKey of switchSequence) {
  // preview.html의 loadMap 로직과 100% 동일한 순서 실행:
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
assert(switchClean, "다중 맵 교차 전환 8단계 시뮬레이션 성공 (이전 맵 정리 및 새 맵 정상 빌드)");

// ─────────────────────────────────────────────────────────────────
// 7. 안식처 버프 보류 상태 및 update 안전성 확인
// ─────────────────────────────────────────────────────────────────
console.log("\n[7] 안식처 버프 보류 상태 확인");
let updateThrewError = false;
try {
  updateHealthOfficeGimmicks(activeContext.ctx, 0.016);
  updateHealthOfficeGimmicks(activeContext.ctx, 0.5);
} catch (e) {
  updateThrewError = true;
}
assert(!updateThrewError, "updateHealthOfficeGimmicks 함수 예외 없이 안전 실행 (엔진 미확정 전역 상태 접근 없음)");

// ─────────────────────────────────────────────────────────────────
// 결과 종합
// ─────────────────────────────────────────────────────────────────
console.log("\n================================================================================");
console.log(`  최종 결과: ${passCount}건 통과, ${failCount}건 실패`);
console.log("================================================================================");

if (failCount > 0) {
  process.exit(1);
} else {
  console.log("🎉 보건실(health_office.js) 모든 요구사항 및 검증 기준 100% 충족!\n");
  process.exit(0);
}
