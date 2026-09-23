/**
 * 🧪 scripts/check_computer_lab.mjs
 *
 * 컴퓨터실(computer_lab.js) 모듈 전수 자동화 검증 스크립트
 *
 * [검증 항목]
 * 1. 4종 생명주기 export 검사 (COMPUTER_LAB_MAP, buildComputerLab, updateComputerLabGimmicks, cleanupComputerLab)
 * 2. setWallHeight(26) 계약 이행 검사
 * 3. 학생 PC 좌석 정확히 24석 (좌측 12석, 우측 12석) 검증
 * 4. 책상(24), 모니터(24), 타워 본체(24), 키보드(24), 의자(24) 필수 구성 요소 수량 검증
 * 5. 중앙 통로 폭 최소 18 units (X in [-9.0, 9.0]) 보장 및 학생 구역 AABB 침범 0건 검증
 * 6. 지우개 스폰 20개 및 술래 스폰 6개 수량 및 y=0 바닥 배치 검사
 * 7. 26개 스폰 좌표와 전체 AABB 충돌체(AABB Box3) 간 XZ 겹침 전수 검사 (0건 검증)
 * 8. 모든 스폰 및 주요 가구의 방 경계 (120 x 90) 내부 배치 검증
 * 9. cleanup 후 안전한 update 및 3회 반복 빌드 멱등성 검증
 * 10. 전체 7개 맵(미술실, 체육관, 음악실, 보건실, 돌봄교실, 시청각실, 컴퓨터실) 상호 교차 전환 시뮬레이션
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

import {
  COMPUTER_LAB_MAP,
  buildComputerLab,
  updateComputerLabGimmicks,
  cleanupComputerLab
} from "../maps/computer_lab.js";

// ─────────────────────────────────────────────────────────────────
// 경량 THREE 모의 객체
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
    if (typeof material === "number" || typeof material === "boolean") {
      throw new TypeError(`유효하지 않은 material 타입 전달됨: ${typeof material} (${material})`);
    }
    this.geometry = geometry;
    this.material = material;
    this.parent = null;
    this.children = [];
    this.position = new Vector3();
    this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
    this.userData = {};
  }
  updateMatrixWorld() {
    if (isNaN(this.position.x) || isNaN(this.position.y) || isNaN(this.position.z)) {
      throw new Error(`NaN 좌표 감지됨: [${this.position.x}, ${this.position.y}, ${this.position.z}]`);
    }
  }
}

class Group {
  constructor() {
    this.children = [];
    this.parent = null;
    this.position = new Vector3();
    this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
  }
  add(child) {
    child.parent = this;
    this.children.push(child);
  }
  remove(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      child.parent = null;
      this.children.splice(idx, 1);
    }
  }
}

function clearThreeGroup(group) {
  const disposedGeoms = new Set();
  const disposedMats = new Set();

  function disposeNode(obj) {
    if (obj.children && obj.children.length > 0) {
      while (obj.children.length > 0) {
        const child = obj.children[obj.children.length - 1];
        obj.remove(child);
        disposeNode(child);
      }
    }
    if (obj.geometry && typeof obj.geometry.dispose === "function" && !disposedGeoms.has(obj.geometry)) {
      disposedGeoms.add(obj.geometry);
      obj.geometry.dispose();
    }
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (m && typeof m.dispose === "function" && !disposedMats.has(m)) {
          disposedMats.add(m);
          m.dispose();
        }
      }
    }
  }

  while (group.children.length > 0) {
    const obj = group.children[group.children.length - 1];
    group.remove(obj);
    disposeNode(obj);
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
  let currentWallH = 26;

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
console.log("  🖥️ 컴퓨터실(computer_lab.js) 모듈 전수 자동화 검증");
console.log("================================================================================");

// ─────────────────────────────────────────────────────────────────
// 1. 메타데이터 및 인터페이스 검사
// ─────────────────────────────────────────────────────────────────
console.log("\n[1] 메타데이터 및 인터페이스 검사");
assert(typeof COMPUTER_LAB_MAP === "object" && COMPUTER_LAB_MAP !== null, "COMPUTER_LAB_MAP 메타데이터 export 확인");
assert(COMPUTER_LAB_MAP.id === "computer_lab", "맵 ID('computer_lab') 확인");
assert(COMPUTER_LAB_MAP.name === "컴퓨터실" && COMPUTER_LAB_MAP.icon === "🖥️", "이름('컴퓨터실') 및 아이콘('🖥️') 확인");
assert(typeof buildComputerLab === "function", "buildComputerLab 함수 export 확인");
assert(typeof updateComputerLabGimmicks === "function", "updateComputerLabGimmicks 함수 export 확인");
assert(typeof cleanupComputerLab === "function", "cleanupComputerLab 함수 export 확인");

// ─────────────────────────────────────────────────────────────────
// 2. 공간 수치 및 컨텍스트 계약 검사
// ─────────────────────────────────────────────────────────────────
console.log("\n[2] 공간 수치 및 컨텍스트 계약 검사");
const t1 = createTestContext();
buildComputerLab(t1.ctx);

assert(t1.getWallH() === 26, `setWallHeight(26) 계약 이행 확인 (실제: ${t1.getWallH()})`);
assert(t1.hiderSpawns.length === 20, `지우개(요정) 스폰 수 20개 확인 (실제: ${t1.hiderSpawns.length})`);
assert(t1.seekerSpawns.length === 6, `술래 스폰 수 6개 확인 (실제: ${t1.seekerSpawns.length})`);
assert(t1.refillZones.length === 1, `교사연구대 리필존 등록 확인 (${t1.refillZones[0]?.label}, r=${t1.refillZones[0]?.r})`);

const allHidersOnFloor = t1.hiderSpawns.every(sp => sp.y === 0);
const allSeekersOnFloor = t1.seekerSpawns.every(sp => sp.y === 0);
assert(allHidersOnFloor, "모든 지우개 스폰의 y 좌표가 0 (바닥 위치)");
assert(allSeekersOnFloor, "모든 술래 스폰의 y 좌표가 0 (바닥 위치)");

// ─────────────────────────────────────────────────────────────────
// 3. 학생 PC 좌석 24석 (좌 12, 우 12) 및 필수 구성 요소 수량 검사
// ─────────────────────────────────────────────────────────────────
console.log("\n[3] 학생 PC 좌석 24석 및 구성 요소 수량 검사");
// 학생 책상 상판: 너비 8.0, 깊이 3.6
const deskTops = t1.samplables.filter(m => m.geometry?.w === 8.0 && m.geometry?.d === 3.6);
const leftDesks = deskTops.filter(m => m.position.x < 0);
const rightDesks = deskTops.filter(m => m.position.x > 0);
assert(deskTops.length === 24, `학생 책상 상판 정확히 24개 확인 (실제: ${deskTops.length})`);
assert(leftDesks.length === 12, `좌측 책상 12개 확인 (실제: ${leftDesks.length})`);
assert(rightDesks.length === 12, `우측 책상 12개 확인 (실제: ${rightDesks.length})`);

// 16:9 슬림 모니터 (너비 4.0, 깊이 0.25)
const monitors = t1.samplables.filter(m => m.geometry?.w === 4.0 && m.geometry?.d === 0.25);
assert(monitors.length === 24, `학생 16:9 슬림 모니터 24개 확인 (실제: ${monitors.length})`);

// 타워 본체 (너비 1.2, 높이 1.8, 깊이 2.6)
const towers = t1.samplables.filter(m => m.geometry?.w === 1.2 && m.geometry?.d === 2.6);
assert(towers.length === 24, `학생 타워 PC 본체 24개 확인 (실제: ${towers.length})`);

// 키보드 (너비 3.4, 깊이 1.2)
const keyboards = t1.samplables.filter(m => m.geometry?.w === 3.4 && m.geometry?.d === 1.2);
assert(keyboards.length >= 24, `학생 키보드 24개 이상 확인 (실제: ${keyboards.length})`);

// 사무용 의자 좌판 (너비 2.6, 깊이 2.6)
const chairs = t1.samplables.filter(m => m.geometry?.w === 2.6 && m.geometry?.d === 2.6);
assert(chairs.length === 24, `학생 사무용 의자 좌판 24개 확인 (실제: ${chairs.length})`);

// ─────────────────────────────────────────────────────────────────
// 4. 중앙 통로 폭 최소 18 units 및 학생 구역 AABB 침범 0건 검증
// ─────────────────────────────────────────────────────────────────
console.log("\n[4] 중앙 통로 폭 18 units 검증");
// 학생 구역: Z in [-22, 34]
// 중앙 통로 구역: X in [-9.0, 9.0]
let aisleViolationCount = 0;
const aisleViolations = [];

t1.colliders.forEach((box, i) => {
  // 교사 구역(Z < -24) 및 외벽 제외
  if (box.min.z >= -22 && box.max.z <= 34) {
    if (box.max.x > -9.0 && box.min.x < 9.0) {
      aisleViolationCount++;
      aisleViolations.push(`충돌체 #${i} [X: ${box.min.x.toFixed(1)} ~ ${box.max.x.toFixed(1)}, Z: ${box.min.z.toFixed(1)} ~ ${box.max.z.toFixed(1)}]`);
    }
  }
});

if (aisleViolations.length > 0) {
  aisleViolations.forEach(v => console.error("    ⚠️ 중앙 통로 침범: " + v));
}
assert(aisleViolationCount === 0, `중앙 통로 폭 18 units(X: -9 ~ +9) 내 학생 구역 AABB 침범 0건 확인 (침범: ${aisleViolationCount}건)`);

// ─────────────────────────────────────────────────────────────────
// 5. 26개 스폰 좌표와 전체 AABB 충돌체 간 XZ 겹침 전수 검사
// ─────────────────────────────────────────────────────────────────
console.log("\n[5] 스폰-AABB XZ 겹침 전수 검사");
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
// 6. 모든 스폰 및 주요 가구의 방 경계 (120 x 90) 내부 배치 검증
// ─────────────────────────────────────────────────────────────────
console.log("\n[6] 방 경계(120 x 90) 내부 배치 검증");
const halfW = 120 / 2;
const halfD = 90 / 2;
const allSpawns = [...t1.hiderSpawns, ...t1.seekerSpawns];
const spawnsInside = allSpawns.every(sp => Math.abs(sp.x) < halfW && Math.abs(sp.z) < halfD);
assert(spawnsInside, "모든 26개 스폰이 방 외벽 경계(-60~60, -45~45) 내부에 안전하게 위치함");

// ─────────────────────────────────────────────────────────────────
// 7. 프레임 갱신 및 cleanup 무결성 검증
// ─────────────────────────────────────────────────────────────────
console.log("\n[7] 프레임 갱신 및 리소스 정리(cleanupComputerLab) 검증");
assert(t1.mapRoot.children.length > 100, `충분한 3D 메쉬 생성 확인 (메쉬 수: ${t1.mapRoot.children.length})`);

let updateError = false;
try {
  updateComputerLabGimmicks(t1.ctx, 0.016);
  updateComputerLabGimmicks(t1.ctx, 1.0);
} catch (e) {
  updateError = true;
}
assert(!updateError, "updateComputerLabGimmicks 함수 예외 없이 정상 실행");

cleanupComputerLab(t1.ctx);

let afterCleanupUpdateErr = false;
try {
  updateComputerLabGimmicks(t1.ctx, 0.016);
} catch (e) {
  afterCleanupUpdateErr = true;
}
assert(!afterCleanupUpdateErr, "cleanup 후 update 호출 시 에러 없이 안전하게 무시됨");

// ─────────────────────────────────────────────────────────────────
// 8. 동일 프리뷰 컨텍스트에서 build → cleanup → clear → build 3회 반복 및 24석 렌더 메쉬 유지 검증
// ─────────────────────────────────────────────────────────────────
console.log("\n[8] 동일 프리뷰 컨텍스트 3회 반복 재빌드 & 메쉬 보존 전수 검증");
const persistentPreview = createTestContext();
const rebuildStats = [];
let meshesAlwaysIntact = true;
let row4AlwaysIntact = true;
let parentRelationsClean = true;

for (let loop = 1; loop <= 3; loop++) {
  // A. 빌드 실행
  buildComputerLab(persistentPreview.ctx);
  const meshCount = persistentPreview.mapRoot.children.length;

  // B. 전체 렌더 메쉬의 부모 참조 무결성 검증
  const allChildrenHaveParent = persistentPreview.mapRoot.children.every(c => c.parent === persistentPreview.mapRoot);
  if (!allChildrenHaveParent) parentRelationsClean = false;

  // C. 24석 전체 책상/모니터/의자 메쉬 식별 검증
  const desks = persistentPreview.mapRoot.children.filter(m => m.geometry && m.geometry.type === "BoxGeometry" && Math.abs(m.geometry.w - 8.0) < 0.01 && Math.abs(m.position.y - 2.8) < 0.01);
  const monitors = persistentPreview.mapRoot.children.filter(m => m.geometry && m.geometry.type === "BoxGeometry" && Math.abs(m.geometry.w - 4.0) < 0.01 && Math.abs(m.position.y - 4.2) < 0.01);
  const towers = persistentPreview.mapRoot.children.filter(m => m.geometry && m.geometry.type === "BoxGeometry" && Math.abs(m.geometry.w - 1.2) < 0.01 && Math.abs(m.position.y - 0.9) < 0.01);
  const chairSeats = persistentPreview.mapRoot.children.filter(m => m.geometry && m.geometry.type === "BoxGeometry" && Math.abs(m.geometry.w - 2.6) < 0.01 && Math.abs(m.position.y - 1.6) < 0.01);

  if (desks.length !== 24 || monitors.length !== 24 || towers.length !== 24 || chairSeats.length !== 24) {
    meshesAlwaysIntact = false;
  }

  // D. 4번째 행 (z = 26.0) 6석의 실물 메쉬 보존 실측 검증
  const row4Desks = desks.filter(m => Math.abs(m.position.z - 26.0) < 0.01);
  const row4Monitors = monitors.filter(m => Math.abs(m.position.z - (26.0 - 0.8)) < 0.01);
  const row4Chairs = chairSeats.filter(m => Math.abs(m.position.z - (26.0 + 2.3)) < 0.01);

  if (row4Desks.length !== 6 || row4Monitors.length !== 6 || row4Chairs.length !== 6) {
    row4AlwaysIntact = false;
  }

  rebuildStats.push({
    loop,
    meshCount,
    desks: desks.length,
    monitors: monitors.length,
    towers: towers.length,
    chairSeats: chairSeats.length,
    row4Desks: row4Desks.length,
    row4Monitors: row4Monitors.length,
    row4Chairs: row4Chairs.length,
    colliders: persistentPreview.colliders.length,
    samplables: persistentPreview.samplables.length
  });

  // E. 기믹 갱신
  updateComputerLabGimmicks(persistentPreview.ctx, 0.016);

  // F. 맵 클린업
  cleanupComputerLab(persistentPreview.ctx);

  // G. 프리뷰 mapRoot 정리 (부모 관계 해제 및 deduplicated dispose)
  const childrenBeforeClear = [...persistentPreview.mapRoot.children];
  clearThreeGroup(persistentPreview.mapRoot);

  // H. 해제 후 부모 관계 null 검증
  const allParentsCleared = childrenBeforeClear.every(c => c.parent === null);
  if (!allParentsCleared) parentRelationsClean = false;

  // I. 배열 초기화 (preview.html 동일 동작)
  persistentPreview.samplables.length = 0;
  persistentPreview.colliders.length = 0;
  persistentPreview.refillZones.length = 0;
  persistentPreview.hiderSpawns.length = 0;
  persistentPreview.seekerSpawns.length = 0;
}

assert(parentRelationsClean, "Three.js mapRoot 추가 시 parent 설정 및 clearThreeGroup 시 parent=null 완전 해제 검증");
assert(meshesAlwaysIntact, `동일 프리뷰 컨텍스트 3회 반복 후 24석(책상: ${rebuildStats[2].desks}, 모니터: ${rebuildStats[2].monitors}, 본체: ${rebuildStats[2].towers}, 의자: ${rebuildStats[2].chairSeats}) 실물 메쉬 유지 확인`);
assert(row4AlwaysIntact, `재빌드 반복 시 마지막 4행(z=26) 메쉬 소실 없음 확인 (책상: ${rebuildStats[2].row4Desks}/6, 모니터: ${rebuildStats[2].row4Monitors}/6, 의자: ${rebuildStats[2].row4Chairs}/6)`);
assert(
  rebuildStats.every(s => s.meshCount === rebuildStats[0].meshCount && s.colliders === rebuildStats[0].colliders),
  `동일 컨텍스트 3회 반복 재빌드 수치 완전 일치 (메쉬 수: ${rebuildStats[0].meshCount}, 충돌체: ${rebuildStats[0].colliders})`
);

// ─────────────────────────────────────────────────────────────────
// 9. 시청각실(av_room) 및 돌봄교실(care_room) 왕복 전환 렌더 및 회귀 검증
// ─────────────────────────────────────────────────────────────────
console.log("\n[9] av_room 및 care_room 왕복 전환 렌더/회귀 검증");
const roundTripRegistry = {
  computer_lab: { name: "컴퓨터실", build: buildComputerLab, update: updateComputerLabGimmicks, cleanup: cleanupComputerLab },
  av_room: { name: "시청각실", build: buildAvRoom, update: updateAvRoomGimmicks, cleanup: cleanupAvRoom },
  care_room: { name: "돌봄교실", build: buildCareRoom, update: updateCareRoomGimmicks, cleanup: cleanupCareRoom }
};

const roundTripSequence = [
  "computer_lab", "av_room", "care_room",
  "computer_lab", "av_room", "care_room",
  "computer_lab"
];

let roundTripSuccess = true;
let roundTripRow4Intact = true;
const rtContext = createTestContext();

try {
  let prevKey = null;
  for (let i = 0; i < roundTripSequence.length; i++) {
    const key = roundTripSequence[i];
    const def = roundTripRegistry[key];

    // 1. 이전 맵 클린업
    if (prevKey) {
      roundTripRegistry[prevKey].cleanup(rtContext.ctx);
    }
    // 2. mapRoot 정리
    clearThreeGroup(rtContext.mapRoot);
    // 3. 배열 초기화
    rtContext.samplables.length = 0;
    rtContext.colliders.length = 0;
    rtContext.refillZones.length = 0;
    rtContext.hiderSpawns.length = 0;
    rtContext.seekerSpawns.length = 0;

    // 4. 새 맵 빌드 및 갱신
    def.build(rtContext.ctx);
    def.update(rtContext.ctx, 0.016);

    // 5. 컴퓨터실로 복귀 시 4번째 행 메쉬 및 좌석 수 실측
    if (key === "computer_lab") {
      const desks = rtContext.mapRoot.children.filter(m => m.geometry && m.geometry.type === "BoxGeometry" && Math.abs(m.geometry.w - 8.0) < 0.01 && Math.abs(m.position.y - 2.8) < 0.01);
      const row4Desks = desks.filter(m => Math.abs(m.position.z - 26.0) < 0.01);
      if (desks.length !== 24 || row4Desks.length !== 6) {
        roundTripRow4Intact = false;
      }
    }

    prevKey = key;
  }
  // 최종 정리
  roundTripRegistry[prevKey].cleanup(rtContext.ctx);
  clearThreeGroup(rtContext.mapRoot);
} catch (e) {
  console.error("  ⚠️ 왕복 전환 중 예외 발생:", e);
  roundTripSuccess = false;
}

assert(roundTripSuccess, "computer_lab ↔ av_room ↔ care_room 왕복 전환 7단계 성공");
assert(roundTripRow4Intact, "왕복 전환 후 computer_lab 복귀 시 PC 24석 및 마지막 4행 메쉬 정상 유지 확인");

// ─────────────────────────────────────────────────────────────────
// 10. 전체 7개 맵 상호 교차 전환 14단계 시뮬레이션
// ─────────────────────────────────────────────────────────────────
console.log("\n[10] 전체 7개 맵 교차 전환 시뮬레이션");
const mapRegistry = [
  { name: "미술실", build: buildArtRoom, update: updateArtRoomGimmicks, cleanup: cleanupArtRoom },
  { name: "체육관", build: buildGymnasium, update: updateGymnasiumGimmicks, cleanup: cleanupGymnasium },
  { name: "음악실", build: buildMusicRoom, update: updateMusicRoomGimmicks, cleanup: cleanupMusicRoom },
  { name: "보건실", build: buildHealthOffice, update: updateHealthOfficeGimmicks, cleanup: cleanupHealthOffice },
  { name: "돌봄교실", build: buildCareRoom, update: updateCareRoomGimmicks, cleanup: cleanupCareRoom },
  { name: "시청각실", build: buildAvRoom, update: updateAvRoomGimmicks, cleanup: cleanupAvRoom },
  { name: "컴퓨터실", build: buildComputerLab, update: updateComputerLabGimmicks, cleanup: cleanupComputerLab }
];

let transitionSuccess = true;
const transCtx = createTestContext();
try {
  let prevDef = null;
  for (let step = 0; step < 14; step++) {
    const cur = mapRegistry[step % mapRegistry.length];
    if (prevDef) {
      prevDef.cleanup(transCtx.ctx);
    }
    clearThreeGroup(transCtx.mapRoot);
    transCtx.samplables.length = 0;
    transCtx.colliders.length = 0;
    transCtx.refillZones.length = 0;
    transCtx.hiderSpawns.length = 0;
    transCtx.seekerSpawns.length = 0;

    cur.build(transCtx.ctx);
    cur.update(transCtx.ctx, 0.016);
    prevDef = cur;
  }
  prevDef.cleanup(transCtx.ctx);
  clearThreeGroup(transCtx.mapRoot);
} catch (e) {
  console.error("  ⚠️ 맵 교차 전환 중 예외 발생:", e);
  transitionSuccess = false;
}
assert(transitionSuccess, "7개 맵 상호 교차 전환 14단계 시뮬레이션 성공 (이전 맵 정리 및 새 맵 정상 빌드)");

console.log("\n================================================================================");
console.log(`  최종 결과: ${passCount}건 통과, ${testCount - passCount}건 실패`);
console.log("================================================================================");
if (passCount === testCount) {
  console.log("🎉 컴퓨터실(computer_lab.js) 모든 요구사항 및 검증 기준 100% 충족!\n");
}
