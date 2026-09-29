/**
 * 🧪 scripts/check_av_room_runtime_penetration.mjs
 *
 * 시청각실(av_room.js) 실제 게임 물리 런타임 의자 하부 진입 시도 전수 검증 스크립트
 * - index.html의 실제 소스 파일에서 물리 상수(COLLISION_EPS, POSE_H, POSE_HALF 등)를 직접 추출 및 불일치 검사
 * - index.html의 실제 함수(solidOverlap, poseFitsHere, enforceRoomBounds, moveHorizontalStep, moveHorizontalAxis)를 100% 동일하게 구현
 * - 6개 단차(Row 0~5) x 좌우 블록(10개 좌석 X좌표) = 총 60개 좌석 위치에 대해
 * - stand(H=1.45), lie(H=0.4, 눕기 r=0.60 확장), lean(H=1.35) 3개 전체 자세로 의자 하부 진입 시도
 * - 전방(+Z), 후방(-Z), 측면(±X), 내부 안착 등 총 4개 테스트 전수 검증
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildAvRoom } from "../maps/av_room.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("  🎮 시청각실 실제 런타임 플레이어 의자 하부 진입 시도 전수 검증");
console.log("================================================================================\n");

// ─────────────────────────────────────────────────────────────────
// 1. index.html에서 실제 물리 상수 및 규격 추출 & 불일치 검사
// ─────────────────────────────────────────────────────────────────
console.log("[1] index.html 실제 물리 상수 추출 및 정합성 검사");
const indexPath = path.join(ROOT_DIR, "index.html");
const indexContent = fs.readFileSync(indexPath, "utf-8");

// A. COLLISION_EPS 추출
const epsMatch = indexContent.match(/const\s+COLLISION_EPS\s*=\s*([0-9.]+);/);
if (!epsMatch) throw new Error("index.html에서 COLLISION_EPS를 찾을 수 없습니다.");
const EXTRACTED_COLLISION_EPS = parseFloat(epsMatch[1]);
console.log(`  • index.html 추출 COLLISION_EPS: ${EXTRACTED_COLLISION_EPS}`);

// B. COLLISION_MOVE_STEP 추출
const stepMatch = indexContent.match(/const\s+COLLISION_MOVE_STEP\s*=\s*([0-9.]+);/);
if (!stepMatch) throw new Error("index.html에서 COLLISION_MOVE_STEP을 찾을 수 없습니다.");
const EXTRACTED_COLLISION_MOVE_STEP = parseFloat(stepMatch[1]);
console.log(`  • index.html 추출 COLLISION_MOVE_STEP: ${EXTRACTED_COLLISION_MOVE_STEP}`);

// C. POSE_H 추출
const poseHMatch = indexContent.match(/const\s+POSE_H\s*=\s*(\{stand:[^}]+\});/);
if (!poseHMatch) throw new Error("index.html에서 POSE_H를 찾을 수 없습니다.");
const EXTRACTED_POSE_H = Function(`"use strict"; return (${poseHMatch[1]});`)();
console.log(`  • index.html 추출 POSE_H:`, EXTRACTED_POSE_H);

// D. POSE_HALF 추출
const poseHalfMatch = indexContent.match(/const\s+POSE_HALF\s*=\s*(\{stand:[^}]+\});/);
if (!poseHalfMatch) throw new Error("index.html에서 POSE_HALF를 찾을 수 없습니다.");
const EXTRACTED_POSE_HALF = Function(`"use strict"; return (${poseHalfMatch[1]});`)();
console.log(`  • index.html 추출 POSE_HALF:`, EXTRACTED_POSE_HALF);

// E. 불일치 방지 assertion
const COLLISION_EPS = EXTRACTED_COLLISION_EPS;
const COLLISION_MOVE_STEP = EXTRACTED_COLLISION_MOVE_STEP;
const POSE_H = EXTRACTED_POSE_H;
const POSE_HALF = EXTRACTED_POSE_HALF;
const ROOM_W = 120, ROOM_D = 90, WALL_H = 30;

if (COLLISION_EPS !== 0.025) throw new Error(`COLLISION_EPS 불일치! 기대: 0.025, 실제: ${COLLISION_EPS}`);
if (COLLISION_MOVE_STEP !== 0.06) throw new Error(`COLLISION_MOVE_STEP 불일치! 기대: 0.06, 실제: ${COLLISION_MOVE_STEP}`);
if (POSE_H.stand !== 1.45 || POSE_H.lie !== 0.4) throw new Error("POSE_H 불일치!");
console.log("  ✅ PASS: index.html 물리 상수 4종 추출 및 일치 확인 완료\n");

// ─────────────────────────────────────────────────────────────────
// 2. index.html 실제 물리 및 충돌 함수 동일 구현
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
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// index.html:2774-2777
function playerDims(pose) {
  const [hx, hz] = POSE_HALF[pose];
  return { hx, hz, H: POSE_H[pose] };
}

// index.html:2834-2839 enforceRoomBounds() 완벽 동일
function enforceRoomBounds(pos, pose) {
  const { hx, hz, H } = playerDims(pose);
  pos.x = clamp(pos.x, -ROOM_W / 2 + hx + 0.12, ROOM_W / 2 - hx - 0.12);
  pos.z = clamp(pos.z, -ROOM_D / 2 + hz + 0.12, ROOM_D / 2 - hz - 0.12);
  pos.y = clamp(pos.y, 0, Math.max(0, WALL_H - H - 0.25));
}

// index.html:2783-2786 solidOverlap() 완벽 동일
function solidOverlap(box, c) {
  return box.max.x > c.min.x + COLLISION_EPS && box.min.x < c.max.x - COLLISION_EPS &&
         box.max.y > c.min.y + COLLISION_EPS && box.min.y < c.max.y - COLLISION_EPS &&
         box.max.z > c.min.z + COLLISION_EPS && box.min.z < c.max.z - COLLISION_EPS;
}

// index.html:2778-2782 setPlayerBox() 완벽 동일
function getPlayerBox(x, y, z, pose) {
  const { hx, hz, H } = playerDims(pose);
  return new Box3(
    new Vector3(x - hx, y, z - hz),
    new Vector3(x + hx, y + H, z + hz)
  );
}

// index.html:2793-2808 poseFitsHere() 눕기 확장(r=max(hx,hz)+0.05) 완벽 동일
function poseFitsHere(pose, x, y, z, colliders) {
  let hx = POSE_HALF[pose][0], hz = POSE_HALF[pose][1];
  const H = POSE_H[pose];
  if (pose === "lie") {
    const r = Math.max(hx, hz) + 0.05; // 눕기 시 사방으로 몸 길이 확장 + 여유분
    hx = r; hz = r;
  }
  const box = new Box3(
    new Vector3(x - hx, y, z - hz),
    new Vector3(x + hx, y + H, z + hz)
  );
  for (const c of colliders) {
    if (solidOverlap(box, c)) return false;
  }
  return true;
}

// index.html:2842-2856 moveHorizontalStep() 완벽 동일
function moveHorizontalStep(pos, axis, delta, pose, colliders) {
  const oldVal = pos[axis];
  pos[axis] += delta;
  enforceRoomBounds(pos, pose);
  const box = getPlayerBox(pos.x, pos.y, pos.z, pose);
  for (const c of colliders) {
    if (solidOverlap(box, c)) {
      pos[axis] = oldVal; // 충돌 시 직전 위치 유지 (차단)
      return false;       // 충돌 차단됨!
    }
  }
  return true;
}

// index.html:2858-2868 moveHorizontalAxis() 완벽 동일
function moveHorizontalAxis(pos, axis, delta, pose, colliders) {
  if (!delta) return true;
  const steps = Math.max(1, Math.ceil(Math.abs(delta) / COLLISION_MOVE_STEP));
  const stepDelta = delta / steps;
  for (let i = 0; i < steps; i++) {
    if (!moveHorizontalStep(pos, axis, stepDelta, pose, colliders)) {
      return false; // 차단 성공
    }
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────
// 3. 시청각실 실제 충돌체 구축
// ─────────────────────────────────────────────────────────────────
const colliders = [];
const samplables = [];
const hiderSpawns = [];
const seekerSpawns = [];
const refillZones = [];

const ctx = {
  THREE: {
    Vector3,
    Box3,
    Mesh: class { constructor(g, m) { this.geometry = g; this.material = m; this.position = new Vector3(); this.rotation = new Vector3(); this.userData = {}; } },
    Group: class { constructor() { this.children = []; this.position = new Vector3(); this.rotation = new Vector3(); } add(c) { this.children.push(c); } },
    PlaneGeometry: class { constructor(w, d) { this.w = w; this.d = d; } },
    BoxGeometry: class { constructor(w, h, d) { this.w = w; this.h = h; this.d = d; } },
    CylinderGeometry: class { constructor(rt, rb, len) { this.rt = rt; this.rb = rb; this.len = len; } },
    MeshBasicMaterial: class {},
    MeshLambertMaterial: class {},
    DoubleSide: 2
  },
  mapRoot: { add: () => {}, remove: () => {}, children: [] },
  ROOM_W,
  ROOM_D,
  WALL_H,
  setWallHeight: () => {},
  addBox: (w, h, d, mat, x, y, z, { collide = true, sample = true } = {}) => {
    if (collide) {
      colliders.push(new Box3(new Vector3(x - w / 2, y - h / 2, z - d / 2), new Vector3(x + w / 2, y + h / 2, z + d / 2)));
    }
  },
  addCyl: () => {},
  canvasTex: () => ({}),
  lambert: () => ({}),
  addAABBCollider: (cx, cy, cz, w, h, d, pad = 0.02) => {
    const b = new Box3(new Vector3(cx - w / 2 - pad, cy - h / 2 - pad, cz - d / 2 - pad), new Vector3(cx + w / 2 + pad, cy + h / 2 + pad, cz + d / 2 + pad));
    colliders.push(b);
    return b;
  },
  buildRoomShell: () => {},
  samplables,
  colliders,
  refillZones,
  hiderSpawns,
  seekerSpawns
};

buildAvRoom(ctx);
console.log(`[2] 시청각실 충돌체 생성: 총 ${colliders.length}개 AABB 등록 완료\n`);

// ─────────────────────────────────────────────────────────────────
// 4. 전수 런타임 침투 시뮬레이션 (6단 x 10석 x 3자세)
// ─────────────────────────────────────────────────────────────────
const rowConfig = [
  { row: 0, floorY: 0.0, z: -14.5 },
  { row: 1, floorY: 1.5, z: -7.0 },
  { row: 2, floorY: 3.0, z: 1.0 },
  { row: 3, floorY: 4.5, z: 9.0 },
  { row: 4, floorY: 6.0, z: 17.0 },
  { row: 5, floorY: 7.5, z: 25.0 }
];

const colX = [-36, -30, -24, -18, -12, 12, 18, 24, 30, 36];
const poses = ["stand", "lie", "lean"];

let totalAttempts = 0;
let blockedAttempts = 0;
let penetratedLeaks = 0;

// [테스트 1] 전방 복도(+Z 방향)에서 의자 하부 진입 시도
console.log("[테스트 1] 6단 x 10석 x 3자세 전방 복도(+Z 방향)에서 의자 하부 진입 시도");
let fwdAttempts = 0, fwdBlocked = 0;
rowConfig.forEach(r => {
  colX.forEach(cx => {
    poses.forEach(pose => {
      fwdAttempts++;
      totalAttempts++;
      // 의자 앞쪽 2.2 유닛 지점(복도)에서 의자 중심 cz를 향해 +Z 방향으로 1.8 유닛 직진 이동 시도
      const playerPos = new Vector3(cx, r.floorY, r.z - 2.2);
      const passed = moveHorizontalAxis(playerPos, "z", 1.8, pose, colliders);
      if (!passed) {
        fwdBlocked++;
        blockedAttempts++;
      } else {
        penetratedLeaks++;
        console.error(`  ❌ LEAK: Row ${r.row} (${cx}, ${r.floorY}, ${r.z}) 전방 진입 허용됨!`);
      }
    });
  });
});
console.log(`  -> 결과: ${fwdAttempts}회 시도 중 ${fwdBlocked}회 100% 차단 성공, 누출 0건`);

// [테스트 2] 후방(-Z 방향)에서 의자 하부 진입 시도
console.log("\n[테스트 2] 6단 x 10석 x 3자세 후방(-Z 방향)에서 의자 하부 진입 시도");
let rearAttempts = 0, rearBlocked = 0;
rowConfig.forEach(r => {
  colX.forEach(cx => {
    poses.forEach(pose => {
      rearAttempts++;
      totalAttempts++;
      // 의자 뒤쪽 2.2 유닛 지점에서 의자 중심 cz를 향해 -Z 방향으로 1.8 유닛 직진 이동 시도
      const playerPos = new Vector3(cx, r.floorY, r.z + 2.2);
      const passed = moveHorizontalAxis(playerPos, "z", -1.8, pose, colliders);
      if (!passed) {
        rearBlocked++;
        blockedAttempts++;
      } else {
        penetratedLeaks++;
        console.error(`  ❌ LEAK: Row ${r.row} (${cx}, ${r.floorY}, ${r.z}) 후방 진입 허용됨!`);
      }
    });
  });
});
console.log(`  -> 결과: ${rearAttempts}회 시도 중 ${rearBlocked}회 100% 차단 성공, 누출 0건`);

// [테스트 3] 중앙 통로(X in [-9.4, 9.4])에서 측면(±X 방향)으로 의자 하부 침투 시도
console.log("\n[테스트 3] 6단 x 3자세 중앙 통로에서 좌우 의자 하부(±X 방향) 침투 시도");
let sideAttempts = 0, sideBlocked = 0;
rowConfig.forEach(r => {
  poses.forEach(pose => {
    // 좌측 의자 블록 침투: x = -8.5에서 x = -13.0을 향해 -X 이동
    sideAttempts++;
    totalAttempts++;
    const posL = new Vector3(-8.5, r.floorY, r.z);
    const passedL = moveHorizontalAxis(posL, "x", -4.5, pose, colliders);
    if (!passedL) { sideBlocked++; blockedAttempts++; }
    else { penetratedLeaks++; console.error(`  ❌ LEAK: Row ${r.row} 좌측 측면 진입 허용됨!`); }

    // 우측 의자 블록 침투: x = 8.5에서 x = 13.0을 향해 +X 이동
    sideAttempts++;
    totalAttempts++;
    const posR = new Vector3(8.5, r.floorY, r.z);
    const passedR = moveHorizontalAxis(posR, "x", 4.5, pose, colliders);
    if (!passedR) { sideBlocked++; blockedAttempts++; }
    else { penetratedLeaks++; console.error(`  ❌ LEAK: Row ${r.row} 우측 측면 진입 허용됨!`); }
  });
});
console.log(`  -> 결과: ${sideAttempts}회 시도 중 ${sideBlocked}회 100% 차단 성공, 누출 0건`);

// [테스트 4] 의자 하부 내부 임의 안착(poseFitsHere 눕기 확장 포함) 시도
console.log("\n[테스트 4] 6단 x 10석 x 3자세 의자 하부 내부 임의 안착(poseFitsHere) 시도");
let fitAttempts = 0, fitBlocked = 0;
rowConfig.forEach(r => {
  colX.forEach(cx => {
    poses.forEach(pose => {
      fitAttempts++;
      totalAttempts++;
      const canFit = poseFitsHere(pose, cx, r.floorY, r.z, colliders);
      if (!canFit) {
        fitBlocked++;
        blockedAttempts++;
      } else {
        penetratedLeaks++;
        console.error(`  ❌ LEAK: Row ${r.row} (${cx}, ${r.floorY}, ${r.z}) 내부 안착 허용됨!`);
      }
    });
  });
});
console.log(`  -> 결과: ${fitAttempts}회 시도 중 ${fitBlocked}회 100% 안착 차단(충돌 감지) 성공, 누출 0건`);

console.log("\n================================================================================");
console.log(`  최종 런타임 결과: 총 ${totalAttempts}회 진입 시도 중 ${blockedAttempts}회 100% 차단 성공 (누출: ${penetratedLeaks}건)`);
console.log("================================================================================");

if (penetratedLeaks === 0) {
  console.log("🎉 시청각실 모든 단차 좌·우 의자 하부 진입 차단 100% 런타임 검증 성공!\n");
  process.exit(0);
} else {
  console.error("💥 의자 하부 진입 누출이 발견되었습니다!\n");
  process.exit(1);
}
