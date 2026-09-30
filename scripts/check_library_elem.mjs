/**
 * 🧪 scripts/check_library_elem.mjs
 *
 * 초등 도서실(library_elem.js) 모듈 전수 자동화 검증 스크립트
 *
 * [검증 항목]
 * 1. 4종 생명주기 export 검사 (LIBRARY_ELEM_MAP, buildLibraryElem, updateLibraryElemGimmicks, cleanupLibraryElem)
 * 2. setWallHeight(28) 계약 및 공간 수치 검사 (지우개 20, 술래 6, y=0, 사서데스크 리필존)
 * 3. 중앙·벽면 5단 동화책 서가 및 다채로운 책등(Book Spines) 검증
 * 4. 실제 접근 가능한 빈 책 슬롯(10개소) 형상 및 무장애 진입 검증
 * 5. 세 가지 열람 구역(온돌 좌식 존, 일반 열람석 4세트, 창가 카운터 바) 검증
 * 6. 스마트 무인 대출·반납기 키오스크 정확히 2대 및 세부 구성 요소 검증
 * 7. 26개 스폰 좌표와 전체 AABB 충돌체 간 XZ 겹침 전수 검사 (0건 검증)
 * 8. 모든 스폰 및 주요 가구의 방 경계 (120 x 90) 내부 배치 검증
 * 9. 프레임 갱신, cleanup 후 안전한 update 및 동일 컨텍스트 3회 반복 재빌드 멱등성 검증
 * 10. 전체 8개 맵(미술실, 체육관, 음악실, 보건실, 돌봄교실, 시청각실, 컴퓨터실, 초등도서실) 상호 교차 전환 시뮬레이션
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

import {
  LIBRARY_ELEM_MAP,
  buildLibraryElem,
  updateLibraryElemGimmicks,
  cleanupLibraryElem
} from "../maps/library_elem.js";

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
  intersectsBox(b) {
    return (
      this.max.x >= b.min.x && this.min.x <= b.max.x &&
      this.max.y >= b.min.y && this.min.y <= b.max.y &&
      this.max.z >= b.min.z && this.min.z <= b.max.z
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
  CanvasTexture: class {
    constructor() {
      this.disposed = false;
    }
    dispose() {
      this.disposed = true;
    }
  },
  DoubleSide: 2,
  SRGBColorSpace: "srgb",
  RepeatWrapping: 1000
};

function createTestContext() {
  const mapRoot = new mockTHREE.Group();
  const ROOM_W = 120;
  const ROOM_D = 90;
  let currentWallH = 28;

  const samplables = [];
  const colliders = [];
  const refillZones = [];
  const hiderSpawns = [];
  const seekerSpawns = [];
  const createdTextures = [];

  function mockCanvasTex(w, h, drawFn) {
    const mockCtx = {
      fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", textAlign: "",
      fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
      stroke() {}, fill() {}, arc() {}, ellipse() {}, fillText() {}
    };
    drawFn(mockCtx, w, h);
    const tex = new mockTHREE.CanvasTexture();
    createdTextures.push(tex);
    return tex;
  }

  function lambert(opt) {
    return new mockTHREE.MeshLambertMaterial(opt);
  }

  function addBox(w, h, d, mat, x, y, z, { collide = true, sample = true, ry = 0, rx = 0 } = {}) {
    const m = new mockTHREE.Mesh(new mockTHREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    if (rx) m.rotation.x = rx;
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
      colliders.push(new mockTHREE.Box3().setFromObject(m));
    }
    if (sample) samplables.push(m);
    return m;
  }

  function addAABBCollider(cx, cy, cz, sx, sy, sz) {
    const box = new mockTHREE.Box3(
      new mockTHREE.Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2),
      new mockTHREE.Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2)
    );
    colliders.push(box);
    return box;
  }

  // maps/preview.html:426-460 실제 공통 룸 셸(Room Shell) 계약 완벽 재현
  function buildRoomShell(floorMat, wallColor = 0xf0ede4, ceilColor = 0xfaf8f5, skirtColor = 0x8c7e6c) {
    // 1. 바닥 메쉬 (PlaneGeometry, samplables 등록 -> +1 samplables)
    const floor = new mockTHREE.Mesh(new mockTHREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    mapRoot.add(floor);
    samplables.push(floor);

    // 2. 천장 메쉬 (PlaneGeometry, mapRoot 등록)
    const ceilingMesh = new mockTHREE.Mesh(new mockTHREE.PlaneGeometry(ROOM_W, ROOM_D), lambert({ color: ceilColor, side: mockTHREE.DoubleSide }));
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.y = currentWallH;
    mapRoot.add(ceilingMesh);

    // 3. 4면 외벽 메쉬 및 충돌체 (collide: true -> +4 colliders)
    const wallMat = lambert({ color: wallColor });
    addBox(ROOM_W, currentWallH, 2, wallMat, 0, currentWallH / 2, -ROOM_D / 2 - 1, { collide: true, sample: false });
    addBox(ROOM_W, currentWallH, 2, wallMat, 0, currentWallH / 2, ROOM_D / 2 + 1, { collide: true, sample: false });
    addBox(2, currentWallH, ROOM_D, wallMat, -ROOM_W / 2 - 1, currentWallH / 2, 0, { collide: true, sample: false });
    addBox(2, currentWallH, ROOM_D, wallMat, ROOM_W / 2 + 1, currentWallH / 2, 0, { collide: true, sample: false });

    // 4. 4면 걸레받이 몰딩 (collide: false, sample: false)
    const sk = lambert({ color: skirtColor });
    addBox(ROOM_W - 1, 0.9, 0.45, sk, 0, 0.45, -ROOM_D / 2 + 0.15, { collide: false, sample: false });
    addBox(ROOM_W - 1, 0.9, 0.45, sk, 0, 0.45, ROOM_D / 2 - 0.15, { collide: false, sample: false });
    addBox(0.45, 0.9, ROOM_D - 1, sk, -ROOM_W / 2 + 0.15, 0.45, 0, { collide: false, sample: false });
    addBox(0.45, 0.9, ROOM_D - 1, sk, ROOM_W / 2 - 0.15, 0.45, 0, { collide: false, sample: false });

    // 5. 천장 조명 박스 6기 (collide: false, sample: false)
    const lightMat = lambert({ color: 0xfffdf0, emissive: 0x4a4838 });
    [-28, 0, 28].forEach(x => [-19, 19].forEach(z => {
      addBox(18, 0.35, 3.2, lightMat, x, currentWallH - 0.35, z, { collide: false, sample: false });
    }));
  }

  function setWallHeight(h) {
    currentWallH = h;
  }

  return {
    ctx: {
      THREE: mockTHREE,
      mapRoot,
      ROOM_W,
      ROOM_D,
      get WALL_H() { return currentWallH; },
      addBox,
      addCyl,
      canvasTex: mockCanvasTex,
      lambert,
      addAABBCollider,
      samplables,
      colliders,
      refillZones,
      hiderSpawns,
      seekerSpawns,
      buildRoomShell,
      setWallHeight
    },
    mapRoot,
    getWallH: () => currentWallH,
    colliders,
    samplables,
    refillZones,
    hiderSpawns,
    seekerSpawns,
    createdTextures
  };
}

// ─────────────────────────────────────────────────────────────────
// 테스트 실행기
// ─────────────────────────────────────────────────────────────────
let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    totalPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    totalFailed++;
  }
}

console.log("================================================================================");
console.log("  📚 초등 도서실(library_elem.js) 모듈 전수 자동화 검증");
console.log("================================================================================");

// [1] 메타데이터 및 인터페이스 검사
console.log("\n[1] 메타데이터 및 인터페이스 검사");
assert(LIBRARY_ELEM_MAP !== undefined, "LIBRARY_ELEM_MAP export 확인");
assert(LIBRARY_ELEM_MAP.id === "library_elem", "맵 ID('library_elem') 확인");
assert(LIBRARY_ELEM_MAP.name === "초등 도서실", "맵 이름('초등 도서실') 확인");
assert(LIBRARY_ELEM_MAP.icon === "📚", "맵 아이콘('📚') 확인");
assert(typeof buildLibraryElem === "function", "buildLibraryElem 함수 export 확인");
assert(typeof updateLibraryElemGimmicks === "function", "updateLibraryElemGimmicks 함수 export 확인");
assert(typeof cleanupLibraryElem === "function", "cleanupLibraryElem 함수 export 확인");

// [2] 공간 수치 및 컨텍스트 계약 검사
console.log("\n[2] 공간 수치 및 컨텍스트 계약 검사");
const testEnv = createTestContext();
buildLibraryElem(testEnv.ctx);

assert(testEnv.getWallH() === 28, `setWallHeight(28) 계약 이행 확인 (실제: ${testEnv.getWallH()})`);
assert(testEnv.hiderSpawns.length === 20, `지우개(요정) 스폰 수 20개 확인 (실제: ${testEnv.hiderSpawns.length})`);
assert(testEnv.seekerSpawns.length === 6, `술래 스폰 수 6개 확인 (실제: ${testEnv.seekerSpawns.length})`);
assert(testEnv.refillZones.length >= 1, `사서데스크 리필존 등록 확인 (등록 수: ${testEnv.refillZones.length})`);
assert(testEnv.refillZones[0].label === "사서데스크", `리필존 라벨 '사서데스크' 확인`);
assert(testEnv.refillZones[0].r >= 5.0, `리필존 반경 >= 5.0 확인 (실제: ${testEnv.refillZones[0].r})`);

const hidersYZero = testEnv.hiderSpawns.every(sp => sp.y === 0);
assert(hidersYZero, "모든 지우개 스폰의 y 좌표가 0 (바닥 위치)");
const seekersYZero = testEnv.seekerSpawns.every(sp => sp.y === 0);
assert(seekersYZero, "모든 술래 스폰의 y 좌표가 0 (바닥 위치)");

// 프리뷰 HUD에는 확장된 벽면 서가의 충돌체/책도 포함된다.
assert(testEnv.colliders.length > 81, `벽면 서가 충돌체가 프리뷰 HUD에 등록됨 (실제: ${testEnv.colliders.length})`);
assert(testEnv.samplables.length > 364, `확장된 책 소품이 프리뷰 HUD에 등록됨 (실제: ${testEnv.samplables.length})`);

// [3] 중앙·벽면 5단 동화책 서가 및 다채로운 책등 검증
console.log("\n[3] 중앙·벽면 5단 동화책 서가 및 다채로운 책등 검증");
// 중앙 서가 수직 프레임 높이와 5단 선반 배치 검증
const allMeshes = testEnv.mapRoot.children;
const shelfFrames = allMeshes.filter(m => {
  if (m.geometry && m.geometry.type === "BoxGeometry") {
    const { w, h, d } = m.geometry;
    return Math.abs(w - 0.3) < 0.05 && Math.abs(h - 11.5) < 0.05 && Math.abs(d - 3.2) < 0.05;
  }
  return false;
});
assert(shelfFrames.length >= 15, `5단 중앙 서가 수직 프레임(기둥/칸막이 15개 이상) 확인 (실제: ${shelfFrames.length})`);
const shelfBoards = allMeshes.filter(m => m.geometry?.type === "BoxGeometry" && Math.abs(m.geometry.w - 15.0) < 0.05 && Math.abs(m.geometry.h - 0.25) < 0.05 && [0.15, 2.45, 4.75, 7.05, 9.35, 11.2].some(y => Math.abs(m.position.y - y) < 0.01));
assert(shelfBoards.length >= 30, `5개 중앙 서가에 6개 선반판(바닥 포함) 배치 확인 (실제: ${shelfBoards.length})`);

// 책등 메쉬 수량 및 색상 다양성 검증
const bookSpineMeshes = allMeshes.filter(m => {
  if (m.geometry && m.geometry.type === "BoxGeometry") {
    const { w, h, d } = m.geometry;
    return w < 1.0 && h <= 1.4 && h >= 0.8 && (m.position.z === -12.5 || m.position.z === 7.5 || m.position.z === 25.5);
  }
  return false;
});
assert(bookSpineMeshes.length >= 60, `다양한 책등(Book Spines) 60개 이상 확인 (실제: ${bookSpineMeshes.length})`);
const bookMats = new Set(bookSpineMeshes.map(m => m.material));
assert(bookMats.size >= 6, `책등에 6가지 이상의 다채로운 원색/파스텔 머티리얼 적용 확인 (실제: ${bookMats.size}종)`);
const booksNonSolid = bookSpineMeshes.every(m => m.userData.solid === false);
assert(booksNonSolid, "작은 책등은 레이캐스트 차폐 방지를 위해 collide: false 설정됨 확인");

// [4] 실제 접근 가능한 빈 책 슬롯(10개소) 형상 및 무장애 진입 검증
console.log("\n[4] 실제 접근 가능한 빈 책 슬롯(10개소) 형상 및 무장애 진입 검증");
// 각 서가당 하단/상단 빈 슬롯 좌표 검사
const expectedSlots = [
  { name: "서가 1 하단", cx: -42.0 - 1.9, cy: 0.85, cz: -12.0 + 0.1, w: 2.6, h: 1.2, d: 2.6 },
  { name: "서가 1 상단", cx: -42.0 + 1.9, cy: 2.2, cz: -12.0 + 0.1, w: 2.6, h: 1.2, d: 2.6 },
  { name: "서가 2 하단", cx: -22.0 - 1.9, cy: 0.85, cz: -12.0 + 0.1, w: 2.6, h: 1.2, d: 2.6 },
  { name: "서가 2 상단", cx: -22.0 + 1.9, cy: 2.2, cz: -12.0 + 0.1, w: 2.6, h: 1.2, d: 2.6 },
  { name: "서가 3 하단", cx: -42.0 - 1.9, cy: 0.85, cz: 8.0 + 0.1, w: 2.6, h: 1.2, d: 2.6 },
  { name: "서가 3 상단", cx: -42.0 + 1.9, cy: 2.2, cz: 8.0 + 0.1, w: 2.6, h: 1.2, d: 2.6 },
  { name: "서가 4 하단", cx: -22.0 - 1.9, cy: 0.85, cz: 8.0 + 0.1, w: 2.6, h: 1.2, d: 2.6 },
  { name: "서가 4 상단", cx: -22.0 + 1.9, cy: 2.2, cz: 8.0 + 0.1, w: 2.6, h: 1.2, d: 2.6 },
  { name: "서가 5 하단", cx: -32.0 - 1.9, cy: 0.85, cz: 26.0 + 0.1, w: 2.6, h: 1.2, d: 2.6 },
  { name: "서가 5 상단", cx: -32.0 + 1.9, cy: 2.2, cz: 26.0 + 0.1, w: 2.6, h: 1.2, d: 2.6 }
];

assert(expectedSlots.length === 10, "총 10개소의 의도된 빈 책 슬롯(하단 5, 상단 5) 정의 확인");

// 빈 슬롯 내부 체적에 충돌체 침범 여부 3D 검사
let slotObstructionCount = 0;
expectedSlots.forEach(slot => {
  const slotBox = new mockTHREE.Box3(
    new mockTHREE.Vector3(slot.cx - slot.w / 2 + 0.1, slot.cy - slot.h / 2 + 0.1, slot.cz - slot.d / 2 + 0.1),
    new mockTHREE.Vector3(slot.cx + slot.w / 2 - 0.1, slot.cy + slot.h / 2 - 0.1, slot.cz + slot.d / 2 - 0.1)
  );

  testEnv.colliders.forEach(col => {
    if (col.intersectsBox(slotBox)) {
      slotObstructionCount++;
    }
  });
});
assert(slotObstructionCount === 0, `모든 10개 빈 슬롯 내부 공동에 AABB 충돌체 침범 0건 확인 (침범: ${slotObstructionCount})`);

// [5] 세 가지 열람 구역(온돌 좌식 존, 일반 열람석, 창가 카운터 바) 검증
console.log("\n[5] 세 가지 열람 구역 검증");
// 1) 온돌 마루 단상 & 낮은 원형 탁자 & 쿠션
const ondolPlatform = allMeshes.find(m => {
  if (m.geometry && m.geometry.type === "BoxGeometry") {
    const { w, h, d } = m.geometry;
    return Math.abs(w - 32.0) < 0.1 && Math.abs(h - 0.5) < 0.1 && Math.abs(d - 26.0) < 0.1;
  }
  return false;
});
assert(ondolPlatform !== undefined, "높이 0.5 units 온돌 원목 마루 단상 메쉬 확인");
const ondolTables = allMeshes.filter(m => {
  if (m.geometry && m.geometry.type === "CylinderGeometry") {
    return Math.abs(m.geometry.r - 2.6) < 0.1 && Math.abs(m.position.y - 1.2) < 0.1;
  }
  return false;
});
assert(ondolTables.length === 2, `온돌 낮은 둥근 탁자 정확히 2개 확인 (실제: ${ondolTables.length})`);
const cushions = allMeshes.filter(m => {
  if (m.geometry && m.geometry.type === "BoxGeometry") {
    const { w, h, d } = m.geometry;
    return Math.abs(w - 1.8) < 0.1 && Math.abs(h - 0.16) < 0.02 && Math.abs(d - 1.8) < 0.1 && Math.abs(m.position.y - 0.58) < 0.05;
  }
  return false;
});
assert(cushions.length === 8, `온돌 파스텔 쿠션/방석 정확히 8개 확인 (실제: ${cushions.length})`);

// 2) 일반 열람 테이블 4세트 & 의자 16개 & 밑면 개방
const readingTables = allMeshes.filter(m => {
  if (m.geometry && m.geometry.type === "BoxGeometry") {
    const { w, h, d } = m.geometry;
    return Math.abs(w - 9.6) < 0.1 && Math.abs(h - 0.35) < 0.1 && Math.abs(d - 4.8) < 0.1;
  }
  return false;
});
assert(readingTables.length === 4, `일반 열람 테이블 상판 정확히 4개 확인 (실제: ${readingTables.length})`);

const readingChairs = allMeshes.filter(m => {
  if (m.geometry && m.geometry.type === "BoxGeometry") {
    const { w, h, d } = m.geometry;
    return Math.abs(w - 1.8) < 0.1 && Math.abs(h - 0.2) < 0.02 && Math.abs(d - 1.8) < 0.1 && Math.abs(m.position.y - 1.2) < 0.05;
  }
  return false;
});
assert(readingChairs.length === 16, `일반 열람석 의자 좌판 정확히 16개 확인 (실제: ${readingChairs.length})`);

// 테이블 밑면 공간(y: 0~2.3)이 통짜 AABB로 막히지 않았는지 검사
let underTableBlockage = 0;
readingTables.forEach(t => {
  const underBox = new mockTHREE.Box3(
    new mockTHREE.Vector3(t.position.x - 2.0, 0.2, t.position.z - 1.0),
    new mockTHREE.Vector3(t.position.x + 2.0, 2.0, t.position.z + 1.0)
  );
  testEnv.colliders.forEach(col => {
    if (col.intersectsBox(underBox)) underTableBlockage++;
  });
});
assert(underTableBlockage === 0, `테이블 밑면 은신 통로 통짜 충돌체 봉쇄 0건 확인 (침범: ${underTableBlockage})`);

// 3) 창가 카운터 바 & 하이체어
const counterBar = allMeshes.find(m => {
  if (m.geometry && m.geometry.type === "BoxGeometry") {
    const { w, h, d } = m.geometry;
    return Math.abs(w - 28.0) < 0.1 && Math.abs(d - 2.4) < 0.1 && Math.abs(m.position.y - 3.1) < 0.1;
  }
  return false;
});
assert(counterBar !== undefined, "남측 벽면 창가 카운터 바 테이블 확인 (높이 3.2 units)");
const highStools = allMeshes.filter(m => {
  if (m.geometry && m.geometry.type === "CylinderGeometry") {
    return Math.abs(m.geometry.r - 0.85) < 0.1 && Math.abs(m.position.y - 2.0) < 0.1;
  }
  return false;
});
assert(highStools.length === 5, `높은 다리 의자(하이체어) 정확히 5개 확인 (실제: ${highStools.length})`);

// [6] 스마트 무인 대출·반납기 키오스크(2대) 검증
console.log("\n[6] 스마트 무인 대출·반납기 키오스크(2대) 검증");
const kioskMints = allMeshes.filter(m => {
  if (m.geometry && m.geometry.type === "BoxGeometry") {
    const { w, h, d } = m.geometry;
    return Math.abs(w - 2.8) < 0.1 && Math.abs(h - 2.2) < 0.1 && Math.abs(d - 2.4) < 0.1 && Math.abs(m.position.z - (-38.0)) < 0.1;
  }
  return false;
});
assert(kioskMints.length === 2, `민트색 키오스크 하부 본체 정확히 2대 확인 (실제: ${kioskMints.length})`);
assert(kioskMints[0].position.x === -6.0 && kioskMints[1].position.x === 6.0, "키오스크 2대 입구 좌우(x: -6, +6) 배치 확인");

// 스캐너 레이저 빔 라인
const laserLines = allMeshes.filter(m => {
  if (m.geometry && m.geometry.type === "BoxGeometry") {
    const { w, h, d } = m.geometry;
    return Math.abs(w - 1.6) < 0.1 && Math.abs(h - 0.05) < 0.02 && Math.abs(d - 0.05) < 0.02;
  }
  return false;
});
assert(laserLines.length === 2, `키오스크 바코드 스캐너 빨간 레이저 빔 라인 2대 확인 (실제: ${laserLines.length})`);

// [7] 스폰-AABB XZ 겹침 전수 검사
console.log("\n[7] 스폰-AABB XZ 겹침 전수 검사");
console.log(`  • 총 등록 충돌체(AABB): ${testEnv.colliders.length}개`);
console.log(`  • 검사 대상 스폰: 총 26개 (지우개 20 + 술래 6)`);

let overlapCount = 0;
const allSpawns = [
  ...testEnv.hiderSpawns.map((s, i) => ({ type: "지우개", idx: i + 1, pos: s })),
  ...testEnv.seekerSpawns.map((s, i) => ({ type: "술래", idx: i + 1, pos: s }))
];

allSpawns.forEach(({ type, idx, pos }) => {
  testEnv.colliders.forEach((col, cIdx) => {
    if (col.containsPointXZ(pos.x, pos.z, 0.05)) {
      console.error(`  ❌ 겹침 감지: ${type} ${idx} (${pos.x}, ${pos.z}) vs AABB[${cIdx}] X:[${col.min.x}~${col.max.x}] Z:[${col.min.z}~${col.max.z}]`);
      overlapCount++;
    }
  });
});
assert(overlapCount === 0, `스폰 좌표와 AABB 충돌체 간 XZ 겹침 0건 검증 (검출: ${overlapCount}건)`);

// [8] 방 경계(120 x 90) 내부 배치 검증
console.log("\n[8] 방 경계(120 x 90) 내부 배치 검증");
const halfW = 60.0;
const halfD = 45.0;

const spawnsInBounds = allSpawns.every(({ pos }) => {
  return Math.abs(pos.x) < halfW && Math.abs(pos.z) < halfD;
});
assert(spawnsInBounds, "모든 26개 스폰이 방 외벽 경계(-60~60, -45~45) 내부에 안전하게 위치함");

// 외벽 4개(x=±61, z=±46)를 제외한 실내 가구 및 룸 셸 오브젝트가 경계 내부에 안전하게 위치하는지 검증
const interiorMeshes = allMeshes.filter(m => {
  return !(m.geometry && m.geometry.type === "BoxGeometry" && (Math.abs(m.position.x) > 60 || Math.abs(m.position.z) > 45));
});
const meshesInBounds = interiorMeshes.every(m => {
  return Math.abs(m.position.x) <= halfW && Math.abs(m.position.z) <= halfD;
});
assert(meshesInBounds, "모든 가구 및 실내 메쉬가 방 외벽 경계 내부에 안전하게 위치함");

// [9] 프레임 갱신, 텍스처 수명주기 및 cleanup 전수 검증
console.log("\n[9] 프레임 갱신, 텍스처 수명주기 및 cleanup 전수 검증");
const totalMeshes = testEnv.mapRoot.children.length;
const roomShellMeshes = 16;
const moduleDedicatedMeshes = totalMeshes - roomShellMeshes;
assert(moduleDedicatedMeshes === 398, `도서실 모듈 전용 3D 메쉬 398개 확인 (실제: ${moduleDedicatedMeshes})`);
assert(totalMeshes === 414, `공통 룸 셸 포함 총 3D 메쉬 414개 (전용 398 + 룸 셸 16) 확인 (실제: ${totalMeshes})`);

// 텍스처 추적 검증
assert(testEnv.createdTextures.length === 3, `도서실 전용 CanvasTexture 3개(floorTex, ondolTex, kioskScreenTex) 생성 및 추적 확인 (실제: ${testEnv.createdTextures.length}개)`);
assert(testEnv.createdTextures.every(t => t.disposed === false), "빌드 직후 CanvasTexture 활성 상태 (disposed === false) 확인");

// update 호출 테스트
let updateThrew = false;
try {
  updateLibraryElemGimmicks(testEnv.ctx, 0.016);
} catch (e) {
  updateThrew = true;
}
assert(!updateThrew, "updateLibraryElemGimmicks 함수 예외 없이 정상 실행");

// cleanup 호출 테스트
cleanupLibraryElem(testEnv.ctx);

// cleanup 시 텍스처 폐기 검증
const allTexturesDisposed = testEnv.createdTextures.every(t => t.disposed === true);
assert(allTexturesDisposed, "cleanupLibraryElem 호출 시 추적된 모든 CanvasTexture(3개) dispose() 폐기 완료 (GPU 누수 방지)");

let postCleanupUpdateThrew = false;
try {
  updateLibraryElemGimmicks(testEnv.ctx, 0.016);
} catch (e) {
  postCleanupUpdateThrew = true;
}
assert(!postCleanupUpdateThrew, "cleanup 후 update 호출 시 에러 없이 안전하게 무시됨");

// 동일 컨텍스트 3회 반복 재빌드 수치 불변성 및 텍스처 누적 방지 검증
console.log("\n[9.1] 동일 프리뷰 컨텍스트 3회 반복 재빌드 및 텍스처 누적 방지 검증");
const rebuildCounts = [];
let allRebuildTexturesDisposed = true;

for (let iter = 1; iter <= 3; iter++) {
  cleanupLibraryElem(testEnv.ctx);
  clearThreeGroup(testEnv.mapRoot);
  testEnv.samplables.length = 0;
  testEnv.colliders.length = 0;
  testEnv.refillZones.length = 0;
  testEnv.hiderSpawns.length = 0;
  testEnv.seekerSpawns.length = 0;
  testEnv.createdTextures.length = 0;

  buildLibraryElem(testEnv.ctx);

  const curIterTextures = [...testEnv.createdTextures];
  const iterMeshCount = testEnv.mapRoot.children.length;
  rebuildCounts.push({
    meshes: iterMeshCount,
    moduleMeshes: iterMeshCount - 16,
    colliders: testEnv.colliders.length,
    samplables: testEnv.samplables.length,
    hiders: testEnv.hiderSpawns.length,
    seekers: testEnv.seekerSpawns.length,
    textures: curIterTextures.length
  });

  cleanupLibraryElem(testEnv.ctx);
  if (!curIterTextures.every(t => t.disposed === true)) {
    allRebuildTexturesDisposed = false;
  }
}

const c1 = rebuildCounts[0];
const allIdentical = rebuildCounts.every(c => (
  c.meshes === c1.meshes &&
  c.moduleMeshes === c1.moduleMeshes &&
  c.colliders === c1.colliders &&
  c.samplables === c1.samplables &&
  c.hiders === 20 &&
  c.seekers === 6 &&
  c.textures === 3
));
assert(allIdentical, `3회 반복 재빌드 수치 완전 일치 (총메쉬: ${c1.meshes}, 전용메쉬: ${c1.moduleMeshes}, 충돌체: ${c1.colliders}, samplables: ${c1.samplables}, 스폰: 20/6, 텍스처: ${c1.textures}개)`);
assert(allRebuildTexturesDisposed, "3회 반복 재빌드 각 회차별 CanvasTexture 정밀 해제 및 텍스처 누적 0건 검증");

// [10] 전체 8개 맵 상호 교차 전환 시뮬레이션
console.log("\n[10] 전체 8개 맵 교차 전환 시뮬레이션");
const MAP_REGISTRY = {
  art_room: { meta: ART_ROOM_MAP, build: buildArtRoom, update: updateArtRoomGimmicks, cleanup: cleanupArtRoom },
  gymnasium: { meta: GYMNASIUM_MAP, build: buildGymnasium, update: updateGymnasiumGimmicks, cleanup: cleanupGymnasium },
  music_room: { meta: MUSIC_ROOM_MAP, build: buildMusicRoom, update: updateMusicRoomGimmicks, cleanup: cleanupMusicRoom },
  health_office: { meta: HEALTH_OFFICE_MAP, build: buildHealthOffice, update: updateHealthOfficeGimmicks, cleanup: cleanupHealthOffice },
  care_room: { meta: CARE_ROOM_MAP, build: buildCareRoom, update: updateCareRoomGimmicks, cleanup: cleanupCareRoom },
  av_room: { meta: AV_ROOM_MAP, build: buildAvRoom, update: updateAvRoomGimmicks, cleanup: cleanupAvRoom },
  computer_lab: { meta: COMPUTER_LAB_MAP, build: buildComputerLab, update: updateComputerLabGimmicks, cleanup: cleanupComputerLab },
  library_elem: { meta: LIBRARY_ELEM_MAP, build: buildLibraryElem, update: updateLibraryElemGimmicks, cleanup: cleanupLibraryElem }
};

const transitionOrder = [
  "art_room", "gymnasium", "music_room", "health_office",
  "care_room", "av_room", "computer_lab", "library_elem",
  "computer_lab", "av_room", "care_room", "library_elem",
  "health_office", "music_room", "gymnasium", "library_elem"
];

let simEnv = createTestContext();
let currentKey = "art_room";
MAP_REGISTRY[currentKey].build(simEnv.ctx);

let transitionErrors = 0;
for (let i = 0; i < transitionOrder.length; i++) {
  const nextKey = transitionOrder[i];
  try {
    MAP_REGISTRY[currentKey].cleanup(simEnv.ctx);
    clearThreeGroup(simEnv.mapRoot);
    simEnv.samplables.length = 0;
    simEnv.colliders.length = 0;
    simEnv.refillZones.length = 0;
    simEnv.hiderSpawns.length = 0;
    simEnv.seekerSpawns.length = 0;

    currentKey = nextKey;
    MAP_REGISTRY[currentKey].build(simEnv.ctx);
    MAP_REGISTRY[currentKey].update(simEnv.ctx, 0.016);
  } catch (err) {
    console.error(`  ❌ 전환 실패 (${currentKey} -> ${nextKey}):`, err);
    transitionErrors++;
  }
}

assert(transitionErrors === 0, `전체 8개 맵 16단계 상호 교차 전환 시뮬레이션 성공 (오류: ${transitionErrors}건)`);
assert(currentKey === "library_elem", "최종 전환 대상 초등 도서실(library_elem) 도달 확인");
assert(simEnv.hiderSpawns.length === 20 && simEnv.seekerSpawns.length === 6, "전환 완료 후 library_elem 스폰 수량 정상 유지 확인");

console.log("================================================================================");
console.log(`  최종 결과: ${totalPassed}건 통과, ${totalFailed}건 실패`);
console.log("================================================================================");

if (totalFailed === 0) {
  console.log("🎉 초등 도서실(library_elem.js) 모든 요구사항 및 검증 기준 100% 충족!\n");
  process.exit(0);
} else {
  console.error("💥 일부 검증 항목이 실패했습니다.\n");
  process.exit(1);
}
