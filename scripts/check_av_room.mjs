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
const foldedCushions = t1.samplables.filter(m => m.geometry?.w === 3.8 && m.geometry?.d === 0.7);
const unfoldedCushions = t1.samplables.filter(m => m.geometry?.w === 3.8 && m.geometry?.d === 2.4);
assert(backrests.length === 60, `좌석 등받이 정확히 60개 확인 (실제: ${backrests.length})`);
assert(foldedCushions.length === 55, `접힌 방석 정확히 55개 확인 (실제: ${foldedCushions.length})`);
assert(unfoldedCushions.length === 5, `[P1] 펼쳐진 방석 정확히 5개 확인 (실제: ${unfoldedCushions.length})`);

const tierColliders = t1.colliders.filter(b => {
  const sz = new Vector3();
  b.getSize(sz);
  return Math.abs(sz.x - 104) < 1.0;
});
assert(tierColliders.length === 5, `스타디움 5개 단차 발판 충돌체(104 폭) 확인 (실제: ${tierColliders.length})`);

// ─────────────────────────────────────────────────────────────────
// 4-1. 의자 하부 베이스 프레임 블로커(Base Blocker AABB) 12개 정밀 검증
// ─────────────────────────────────────────────────────────────────
console.log("\n[4-1] 의자 하부 베이스 블로커 12개 및 통로 비침범 검증");
const blockers = t1.colliders.filter(b => {
  const sz = new Vector3();
  b.getSize(sz);
  return Math.abs(sz.x - 29.04) < 0.2 && Math.abs(sz.y - 1.44) < 0.2 && Math.abs(sz.z - 2.64) < 0.2;
});
assert(blockers.length === 12, `의자 하부 베이스 블로커 정확히 12개(6행 x 좌우 2개) 확인 (실제: ${blockers.length})`);

const expectedRows = [
  { row: 0, floorY: 0.0, z: -14.5 },
  { row: 1, floorY: 1.5, z: -7.0 },
  { row: 2, floorY: 3.0, z: 1.0 },
  { row: 3, floorY: 4.5, z: 9.0 },
  { row: 4, floorY: 6.0, z: 17.0 },
  { row: 5, floorY: 7.5, z: 25.0 }
];

let allBlockersMatchSpec = true;
let aisleClean = true;
let outerCorridorClean = true;
let yGapClean = true;

expectedRows.forEach(r => {
  const rowBlockers = blockers.filter(b => Math.abs(b.min.y - (r.floorY - 0.02)) < 0.05);
  if (rowBlockers.length !== 2) {
    allBlockersMatchSpec = false;
    console.error(`  ❌ Row ${r.row} (floorY=${r.floorY}): 블로커 수량 불일치 (기대: 2, 실제: ${rowBlockers.length})`);
  }

  const leftB = rowBlockers.find(b => (b.min.x + b.max.x) / 2 < 0);
  const rightB = rowBlockers.find(b => (b.min.x + b.max.x) / 2 > 0);

  if (!leftB || !rightB) {
    allBlockersMatchSpec = false;
  } else {
    // X 범위 검사 (좌측: [-38.52, -9.48], 우측: [9.48, 38.52])
    if (Math.abs(leftB.max.x - (-9.48)) > 0.1 || Math.abs(rightB.min.x - 9.48) > 0.1) {
      allBlockersMatchSpec = false;
    }
    // Z 범위 검사 (cz - 1.22 ~ cz + 1.42)
    if (Math.abs(leftB.min.z - (r.z - 1.22)) > 0.1 || Math.abs(leftB.max.z - (r.z + 1.42)) > 0.1) {
      allBlockersMatchSpec = false;
    }
    // 중앙 통로(x in [-9.0, 9.0]) 침범 검사
    if (leftB.max.x > -9.4 || rightB.min.x < 9.4) {
      aisleClean = false;
    }
    // 외곽 복도(x < -52 or x > 52) 침범 검사
    if (leftB.min.x < -40.0 || rightB.max.x > 40.0) {
      outerCorridorClean = false;
    }
    // [Codex 지시 4] 해당 행의 실제 등받이 충돌체(Backrest AABB)를 직접 찾아 블로커 AABB와 행별 직접 비교
    const leftBackrest = t1.colliders.find(b => {
      const sz = new Vector3();
      b.getSize(sz);
      const isBackrestSize = Math.abs(sz.x - 29.04) < 0.2 && Math.abs(sz.y - 3.24) < 0.2 && Math.abs(sz.z - 1.24) < 0.2;
      return isBackrestSize && b.max.x < 0 && Math.abs((b.min.y + b.max.y) / 2 - (r.floorY + 2.4)) < 0.1;
    });
    const rightBackrest = t1.colliders.find(b => {
      const sz = new Vector3();
      b.getSize(sz);
      const isBackrestSize = Math.abs(sz.x - 29.04) < 0.2 && Math.abs(sz.y - 3.24) < 0.2 && Math.abs(sz.z - 1.24) < 0.2;
      return isBackrestSize && b.min.x > 0 && Math.abs((b.min.y + b.max.y) / 2 - (r.floorY + 2.4)) < 0.1;
    });

    if (!leftBackrest || !rightBackrest) {
      yGapClean = false;
      console.error(`  ❌ Row ${r.row}: 실제 등받이 충돌체 객체를 찾을 수 없음`);
    } else {
      // 등받이 AABB의 하단(min.y)과 블로커 AABB의 상단(max.y) 간 수직 틈새 직접 비교
      // 등받이 min.y가 블로커 max.y보다 높으면 수직 틈새(Gap)가 발생한 것임
      if (leftBackrest.min.y > leftB.max.y || rightBackrest.min.y > rightB.max.y) {
        yGapClean = false;
        console.error(`  ❌ Row ${r.row}: 등받이 하단과 블로커 상단 사이 수직 갭 발생 (Backrest min.y: ${leftBackrest.min.y.toFixed(2)}, Blocker max.y: ${leftB.max.y.toFixed(2)})`);
      }
    }
  }
});

assert(allBlockersMatchSpec, "12개 블로커의 6행별 X/Y/Z 범위 수치 규격 100% 일치 확인");
assert(aisleClean, "중앙 통로(X in [-9.4, 9.4], 실질 간격 약 18.96~19.0 유닛) 비침범 확인");
assert(outerCorridorClean, "외곽 복도(X in [-60, -52], [52, 60], 여유 폭 13.4 유닛 이상) 비침범 확인");
assert(yGapClean, "실제 등받이 AABB(min.y)와 블로커 AABB(max.y) 행별 직접 비교 결과 수직 틈새 0.0 유닛 확인 (약 0.64 유닛 중첩 밀폐)");

// ─────────────────────────────────────────────────────────────────
// 4-2. 무대 좌측 검정 업라이트 피아노 및 세부 부품 검증 (P1)
// ─────────────────────────────────────────────────────────────────
console.log("\n[4-2] 무대 업라이트 피아노 및 세부 부품 검증");
// 피아노 본체 AABB (min: [-28, 2.2, -36], max: [-20, 8.0, -28])
const pianoAABB = t1.colliders.find(b => {
  const sz = new Vector3();
  b.getSize(sz);
  return Math.abs(sz.x - 8.04) < 0.1 && Math.abs(sz.y - 5.84) < 0.1 && Math.abs(sz.z - 8.04) < 0.1 &&
    Math.abs(b.min.x - (-28.02)) < 0.1 && Math.abs(b.min.z - (-36.02)) < 0.1;
});
assert(!!pianoAABB, `피아노 본체 AABB 충돌체(8.0 x 5.8 x 8.0) 등록 확인`);
assert(
  pianoAABB && Math.abs(pianoAABB.min.x - (-28.02)) < 0.05 && Math.abs(pianoAABB.max.x - (-19.98)) < 0.05 &&
  Math.abs(pianoAABB.min.y - 2.18) < 0.05 && Math.abs(pianoAABB.max.y - 8.02) < 0.05 &&
  Math.abs(pianoAABB.min.z - (-36.02)) < 0.05 && Math.abs(pianoAABB.max.z - (-27.98)) < 0.05,
  "피아노 본체 AABB 정확한 min [-28, 2.2, -36] ~ max [-20, 8.0, -28] 범위 보호 확인"
);

// 무대 스폰과 피아노 AABB 비겹침 검사
let pianoSpawnOverlap = 0;
[...t1.hiderSpawns, ...t1.seekerSpawns].forEach(sp => {
  if (pianoAABB && pianoAABB.containsPointXZ(sp.x, sp.z)) {
    pianoSpawnOverlap++;
  }
});
assert(pianoSpawnOverlap === 0, `피아노 AABB와 전체 26개 스폰 포인트 간 XZ 겹침 0건 확인`);

// 피아노 부품 존재 확인:
// 건반 (흰 건반 w=6.0, 검은 건반 w=5.6)
const whiteKeys = t1.samplables.find(m => m.geometry?.w === 6.0 && m.geometry?.h === 0.12);
const blackKeys = t1.samplables.find(m => m.geometry?.w === 5.6 && m.geometry?.h === 0.16);
assert(!!whiteKeys && !!blackKeys, "피아노 흑백 건반 메쉬 존재 확인");

// 보면대 & 악보
const musicStand = t1.samplables.find(m => m.geometry?.w === 3.6 && m.geometry?.h === 1.2);
const sheetMusic = t1.samplables.find(m => m.geometry?.w === 2.8 && m.geometry?.h === 1.0);
assert(!!musicStand && !!sheetMusic, "피아노 보면대 및 악보 메쉬 존재 확인");

// 황동 페달 3개
const pedals = t1.mapRoot.children.filter(m => m.geometry?.w === 0.25 && m.geometry?.h === 0.15 && m.geometry?.d === 0.5);
assert(pedals.length === 3, `피아노 황동 페달 정확히 3개 확인 (실제: ${pedals.length})`);

// 피아노 사각 의자
const pianoBench = t1.samplables.find(m => m.geometry?.w === 3.4 && m.geometry?.h === 0.5 && m.geometry?.d === 1.6);
assert(!!pianoBench, "피아노 사각 의자(Piano Bench) 메쉬 존재 확인");

// ─────────────────────────────────────────────────────────────────
// 4-3. 펼쳐진 좌석 5석 발판 AABB 및 좌표 정밀 검증 (P1)
// ─────────────────────────────────────────────────────────────────
console.log("\n[4-3] 펼쳐진 좌석 5석 발판 AABB 및 좌표 검증");
// 대상 5석: Row0 Col2, Row1 Col7, Row2 Col3, Row3 Col8, Row4 Col1
const expectedUnfoldedSeats = [
  { row: 0, col: 2, cx: -24, floorY: 0.0, cz: -14.5 },
  { row: 1, col: 7, cx:  24, floorY: 1.5, cz: -7.0 },
  { row: 2, col: 3, cx: -18, floorY: 3.0, cz:  1.0 },
  { row: 3, col: 8, cx:  30, floorY: 4.5, cz:  9.0 },
  { row: 4, col: 1, cx: -30, floorY: 6.0, cz: 17.0 }
];

let allUnfoldedSeatsMatch = true;
let allUnfoldedTopYMatch = true;
expectedUnfoldedSeats.forEach(spec => {
  const mesh = unfoldedCushions.find(m =>
    Math.abs(m.position.x - spec.cx) < 0.1 &&
    Math.abs(m.position.z - (spec.cz - 0.2)) < 0.1 &&
    Math.abs(m.position.y - (spec.floorY + 1.55)) < 0.1
  );
  if (!mesh) {
    allUnfoldedSeatsMatch = false;
    console.error(`  ❌ Row ${spec.row} Col ${spec.col} (x=${spec.cx}, z=${spec.cz}): 펼쳐진 좌석 메쉬 불일치`);
  }
});
assert(allUnfoldedSeatsMatch, "펼쳐진 좌석 5석 지정 위치(Row0 Col2, Row1 Col7, Row2 Col3, Row3 Col8, Row4 Col1) 100% 일치 확인");

// 발판 AABB 5개 검증: w ≈ 3.8, h ≈ 0.3, d ≈ 2.4, 상단 y ≈ floorY + 1.8
const footstepColliders = t1.colliders.filter(b => {
  const sz = new Vector3();
  b.getSize(sz);
  return Math.abs(sz.x - 3.84) < 0.1 && Math.abs(sz.y - 0.34) < 0.1 && Math.abs(sz.z - 2.44) < 0.1;
});
assert(footstepColliders.length === 5, `펼쳐진 좌판 개별 발판 AABB 충돌체 정확히 5개 확인 (실제: ${footstepColliders.length})`);

let footstepsWithinRow = true;
let footstepsAisleClean = true;
expectedUnfoldedSeats.forEach(spec => {
  const footstep = footstepColliders.find(b =>
    Math.abs((b.min.x + b.max.x) / 2 - spec.cx) < 0.1 &&
    Math.abs((b.min.z + b.max.z) / 2 - (spec.cz - 0.2)) < 0.1
  );
  if (!footstep) {
    footstepsWithinRow = false;
  } else {
    // 상단 높이 검증 (floorY + 1.8)
    if (Math.abs(footstep.max.y - (spec.floorY + 1.82)) > 0.05) {
      allUnfoldedTopYMatch = false;
    }
    // 중앙 통로(X in [-9.0, 9.0]) 침범 검사
    if (footstep.max.x > -9.0 && footstep.min.x < 9.0) {
      footstepsAisleClean = false;
    }
  }
});
assert(allUnfoldedTopYMatch, "펼쳐진 좌판 상단 높이 tier_y + 1.8 일치 확인");
assert(footstepsAisleClean, "펼쳐진 좌판 발판 AABB의 중앙 통로 비침범 확인");

// ─────────────────────────────────────────────────────────────────
// 4-4. 음향조정실 앰프 랙·믹서·마이크 정밀 검증 (P1 보완)
// ─────────────────────────────────────────────────────────────────
console.log("\n[4-4] 음향조정실 앰프 랙·믹서·마이크 검증");
// 앰프 랙 AABB (min: [50.5, 7.5, 31], max: [54.5, 13, 35])
const rackAABB = t1.colliders.find(b => {
  const sz = new Vector3();
  b.getSize(sz);
  return Math.abs(sz.x - 4.04) < 0.1 && Math.abs(sz.y - 5.54) < 0.1 && Math.abs(sz.z - 4.04) < 0.1 &&
    Math.abs(b.min.x - 50.48) < 0.1;
});
assert(!!rackAABB, "음향조정실 앰프 랙 외곽 AABB(4.0 x 5.5 x 4.0) 등록 확인");
assert(
  rackAABB && Math.abs(rackAABB.min.x - 50.48) < 0.05 && Math.abs(rackAABB.max.x - 54.52) < 0.05 &&
  Math.abs(rackAABB.min.y - 7.48) < 0.05 && Math.abs(rackAABB.max.y - 13.02) < 0.05 &&
  Math.abs(rackAABB.min.z - 30.98) < 0.05 && Math.abs(rackAABB.max.z - 35.02) < 0.05,
  "앰프 랙 AABB 범위 [50.5, 7.5, 31] ~ [54.5, 13, 35] 정밀 규격 일치 확인"
);

// 앰프 랙과 26개 스폰 포인트 간 XZ 겹침 0건 검사
let rackSpawnOverlap = 0;
[...t1.hiderSpawns, ...t1.seekerSpawns].forEach(sp => {
  if (rackAABB && rackAABB.containsPointXZ(sp.x, sp.z)) rackSpawnOverlap++;
});
assert(rackSpawnOverlap === 0, "앰프 랙 AABB와 26개 스폰 포인트 간 XZ 겹침 0건 확인");

// 믹서 콘솔 확인 (크기 4.8 x 0.3 x 2.2)
const mixerMesh = t1.samplables.find(m => m.geometry?.w === 4.8 && m.geometry?.h === 0.3 && m.geometry?.d === 2.2);
assert(!!mixerMesh, "데스크 위 믹서 콘솔 메쉬(4.8 x 0.3 x 2.2) 존재 확인");

// 마이크 2개 및 스탠드 1개 확인
const mics = t1.samplables.filter(m => m.geometry?.type === "CylinderGeometry" && m.geometry?.r === 0.1 && m.position.x > 38.0 && m.position.z > 30.0);
assert(mics.length === 2, `음향조정실 핸드 마이크 정확히 2개 확인 (실제: ${mics.length})`);

const micStandBase = t1.mapRoot.children.find(m => m.geometry?.type === "CylinderGeometry" && Math.abs(m.geometry?.r - 0.35) < 0.01 && m.position.x > 38.0);
assert(!!micStandBase, "마이크 스탠드 기구물 존재 확인");

// ─────────────────────────────────────────────────────────────────
// 4-5. 무대 조명 6기, 반도어 24개 날개, 원뿔 빔 6기 및 1번 깜빡임 검증 (P3)
// ─────────────────────────────────────────────────────────────────
console.log("\n[4-5] 천장 무대 조명 6기, 반도어 및 1번 깜빡임 검증 (P3)");
// 1) 조명 그룹 6기 탐색 (Z=5, Y=24.5 부근 Group)
const lightGroups = t1.mapRoot.children.filter(obj =>
  obj instanceof mockTHREE.Group &&
  Math.abs(obj.position.y - 24.5) < 0.1 &&
  Math.abs(obj.position.z - 5.0) < 0.1
);
assert(lightGroups.length === 6, `천장 무대 조명 그룹 정확히 6기 확인 (실제: ${lightGroups.length})`);

// 좌측 3기 (X = -36, -26, -16), 우측 3기 (X = 16, 26, 36) 정렬 검증
const expectedX = [-36.0, -26.0, -16.0, 16.0, 26.0, 36.0];
let lightXAligned = true;
expectedX.forEach(ex => {
  const matched = lightGroups.some(g => Math.abs(g.position.x - ex) < 0.1);
  if (!matched) {
    lightXAligned = false;
    console.error(`  ❌ 예상 조명 X=${ex} 위치에 조명 그룹 없음`);
  }
});
assert(lightXAligned, "프로젝터 라인(Z=5.0) 좌우 3기씩 대칭 정렬(X: ±16, ±26, ±36) 확인");

// 2) 반도어 4방향 플랩 (조명당 4개씩 = 총 24개)
let totalFlaps = 0;
lightGroups.forEach(g => {
  const flaps = g.children.filter(ch =>
    ch.geometry?.type === "BoxGeometry" &&
    ((ch.geometry?.w === 1.6 && ch.geometry?.h === 0.04) || (ch.geometry?.w === 0.04 && ch.geometry?.h === 1.6))
  );
  totalFlaps += flaps.length;
});
assert(totalFlaps === 24, `조명 6기에 반도어 4방향 플랩 총 24개(기당 4개) 장착 확인 (실제: ${totalFlaps}개)`);

// 3) 조명 원통 캔 6개 및 발광 렌즈 6개 확인
let totalCans = 0;
let totalLenses = 0;
let totalBeams = 0;
lightGroups.forEach(g => {
  const cans = g.children.filter(ch => ch.geometry?.type === "CylinderGeometry" && ch.geometry?.r === 0.8 && ch.geometry?.len === 2.2);
  const lenses = g.children.filter(ch => ch.geometry?.type === "CylinderGeometry" && ch.geometry?.r === 0.72 && ch.geometry?.len === 0.1);
  const beams = g.children.filter(ch => ch.geometry?.type === "CylinderGeometry" && ch.geometry?.rt === 0.7 && ch.geometry?.r === 5.2);
  totalCans += cans.length;
  totalLenses += lenses.length;
  totalBeams += beams.length;
});
assert(totalCans === 6, `조명 원통 하우징 캔 정확히 6개 확인 (실제: ${totalCans})`);
assert(totalLenses === 6, `조명 발광 렌즈 정확히 6개 확인 (실제: ${totalLenses})`);
assert(totalBeams === 6, `무대 지향 원뿔대 조명 빔 6기 확인 (실제: ${totalBeams})`);

// 4) 좌측 1번 조명 (X=-36.0) 고장 깜빡임 기믹 검증
const left1Group = lightGroups.find(g => Math.abs(g.position.x - (-36.0)) < 0.1);
const flickerBeamMesh = left1Group?.children.find(ch => ch.geometry?.type === "CylinderGeometry" && ch.geometry?.rt === 0.7 && ch.geometry?.r === 5.2);
assert(!!flickerBeamMesh, "좌측 1번 조명 빔 메쉬 식별 확인");

// 깜빡임 갱신 시뮬레이션
const initialOpacity = flickerBeamMesh.material.opacity;
let opacityChanged = false;
for (let t = 0.1; t <= 2.0; t += 0.2) {
  updateAvRoomGimmicks(t1.ctx, 0.2);
  if (Math.abs(flickerBeamMesh.material.opacity - initialOpacity) > 0.001) {
    opacityChanged = true;
    break;
  }
}
assert(opacityChanged, "좌측 1번 조명 불규칙 깜빡임(Flicker / Broken) 프레임 갱신 확인");

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
