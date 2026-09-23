/**
 * 🎬 maps/av_room.js - 시청각실 (Audio-Visual Room)
 * 
 * 《교실 대소동: 사라진 지우개 찾기》 독립 맵 모듈
 * - 의존성 주입(ctx) 패턴 준수
 * - setWallHeight(30) 계약 준수 (엔진 공통 규격 ROOM_W=120, ROOM_D=90)
 * - Zero-Asset 원칙: Three.js 절차적 지오메트리 & 2D Canvas 텍스처
 * - 표준 생명주기: AV_ROOM_MAP, buildAvRoom, updateAvRoomGimmicks, cleanupAvRoom
 */

export const AV_ROOM_MAP = {
  id: "av_room",
  name: "시청각실",
  icon: "🎬"
};

// 기믹 및 리소스 상태 관리 (모듈 내부 격리)
let avGimmickState = {
  disposableMaterials: [],
  disposableGeometries: [],
  beamMesh: null,
  animTime: 0
};

/**
 * 시청각실 3D 공간 생성
 * @param {Object} ctx - 엔진 주입 컨텍스트
 */
export function buildAvRoom(ctx) {
  const {
    THREE, mapRoot, ROOM_W, ROOM_D,
    addBox, addCyl, canvasTex, lambert,
    addAABBCollider, samplables, colliders,
    refillZones, hiderSpawns, seekerSpawns,
    buildRoomShell, setWallHeight
  } = ctx;

  // 1. 벽 높이 설정 계약 (30 유닛)
  const WALL_H = 30;
  if (typeof setWallHeight === "function") {
    setWallHeight(WALL_H);
  }

  // 리소스 추적 헬퍼
  const trackMat = (mat) => {
    avGimmickState.disposableMaterials.push(mat);
    return mat;
  };
  const trackGeom = (geom) => {
    avGimmickState.disposableGeometries.push(geom);
    return geom;
  };

  // ─────────────────────────────────────────────────────────────────
  // 2. 머티리얼 및 텍스처 정의 (시청각실 전용 Zero-Asset 팔레트)
  // ─────────────────────────────────────────────────────────────────
  // 바닥 카펫 텍스처 (어두운 네이비 블루 직조 카펫)
  const floorTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#1e2230";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(45, 52, 75, 0.4)";
    for (let x = 0; x < w; x += 8) {
      g.fillRect(x, 0, 4, h);
    }
    for (let y = 0; y < h; y += 8) {
      g.fillRect(0, y, w, 4);
    }
  }, 8, 6);

  // 무대 원목 텍스처
  const stageWoodTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#8c5a2b";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#734820";
    for (let y = 0; y < h; y += 32) {
      g.fillRect(0, y, w, 2);
    }
  }, 4, 2);

  // 흡음 패널 텍스처 (라이트 그레이/베이지 펀칭 타공망)
  const acousticTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = "#d8d4cd";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#a8a49d";
    for (let x = 8; x < w; x += 16) {
      for (let y = 8; y < h; y += 16) {
        g.beginPath();
        g.arc(x, y, 2.5, 0, Math.PI * 2);
        g.fill();
      }
    }
  }, 6, 4);

  const carpetMat = trackMat(lambert({ map: floorTex }));
  const stageWoodMat = trackMat(lambert({ map: stageWoodTex }));
  const stageFrontMat = trackMat(lambert({ color: 0x5a3618 }));
  const acousticMat = trackMat(lambert({ map: acousticTex }));
  const chairFabricMat = trackMat(lambert({ color: 0x9e2a2b })); // 붉은 벽돌색
  const chairFoldMat = trackMat(lambert({ color: 0xb23a3b }));   // 접힌 좌석
  const chairFrameMat = trackMat(lambert({ color: 0x2b2d42 }));  // 다리 철제
  const screenMat = trackMat(lambert({ color: 0xf4f1de }));      // 스크린 아이보리
  const screenBorderMat = trackMat(lambert({ color: 0x111115 }));// 스크린 블랙 테두리
  const soundproofDoorMat = trackMat(lambert({ color: 0x3d405b })); // 방음문 스틸
  const consoleWoodMat = trackMat(lambert({ color: 0x4a3525 })); // 음향 데스크

  // 룸 쉘 생성 (어두운 극장 벽면 & 카펫 바닥)
  buildRoomShell(carpetMat, 0x282c3f, 0x181a24, 0x3d405b);

  // ─────────────────────────────────────────────────────────────────
  // 3. 전면 무대 및 롤스크린 은신 통로 (Front Stage & Screen)
  // ─────────────────────────────────────────────────────────────────
  // 무대 규격: 70 x 2.2 x 25, 중심 (0, 1.1, -31)
  // Z축 범위: -43.5 ~ -18.5
  addBox(70, 2.2, 25, stageWoodMat, 0, 1.1, -31, { collide: false, sample: true });
  addAABBCollider(0, 1.1, -31, 70, 2.2, 25);

  // 무대 전면 마감 걸레받이
  addBox(70.2, 0.4, 0.6, stageFrontMat, 0, 0.2, -18.2, { collide: false, sample: false });

  // 무대 좌우 계단 (X = ±37.5, Z = -22.5 부근, 단차 1.1 유닛 2단)
  [-37.5, 37.5].forEach(stX => {
    addBox(4.5, 1.1, 4.0, stageWoodMat, stX, 0.55, -20.5, { collide: false, sample: true });
    addBox(4.5, 2.2, 4.0, stageWoodMat, stX, 1.1, -24.5, { collide: false, sample: true });
    addAABBCollider(stX, 1.1, -22.5, 4.6, 2.2, 8.2);
  });

  // 대형 롤스크린 (폭 55, 높이 20, 두께 0.4)
  // 위치: 중심 (0, 12.2, -42.8) -> 전면 벽(Z=-45)과의 사이에 1.8~2.0 units의 실제 진입 은신 통로 확보!
  addBox(55, 20, 0.4, screenMat, 0, 12.2, -42.8, { collide: false, sample: true });
  // 스크린 상하단 블랙 마감 케이싱
  addBox(56, 0.8, 0.8, screenBorderMat, 0, 2.6, -42.8, { collide: false, sample: false });
  addBox(56, 1.0, 1.0, screenBorderMat, 0, 22.2, -42.8, { collide: false, sample: false });
  // 스크린 자체 충돌체 (양옆 X=±27.5 바깥으로 걸어서 스크린 뒤로 진입 가능)
  addAABBCollider(0, 12.2, -42.8, 55, 20, 0.6);

  // ─────────────────────────────────────────────────────────────────
  // 4. 스타디움식 계단 바닥 6단 (Tiered Seating Floor)
  // ─────────────────────────────────────────────────────────────────
  // 단차 높이 1.5 유닛 (1단 y=0, 2단 y=1.5, 3단 y=3.0, 4단 y=4.5, 5단 y=6.0, 6단 y=7.5)
  // 너비 104 유닛 (X: -52 ~ 52) -> 좌우 벽면(X=±60) 사이에 폭 8유닛의 y=0 평지 이동 복도 보장
  const tiers = [
    { tier: 2, y: 1.5, h: 1.5, zMin: -11, zMax: -3, zC: -7, depth: 8 },
    { tier: 3, y: 3.0, h: 3.0, zMin: -3, zMax: 5, zC: 1, depth: 8 },
    { tier: 4, y: 4.5, h: 4.5, zMin: 5, zMax: 13, zC: 9, depth: 8 },
    { tier: 5, y: 6.0, h: 6.0, zMin: 13, zMax: 21, zC: 17, depth: 8 },
    { tier: 6, y: 7.5, h: 7.5, zMin: 21, zMax: 43.5, zC: 32.25, depth: 22.5 }
  ];

  tiers.forEach(t => {
    addBox(104, t.h, t.depth, carpetMat, 0, t.h / 2, t.zC, { collide: false, sample: true });
    addAABBCollider(0, t.h / 2, t.zC, 104, t.h, t.depth);
  });

  // ─────────────────────────────────────────────────────────────────
  // 5. 극장식 붉은 벽돌색 접이식 의자 (총 6행 x 10석 = 60석)
  // ─────────────────────────────────────────────────────────────────
  const rowConfig = [
    { row: 0, floorY: 0.0, z: -14.5 },
    { row: 1, floorY: 1.5, z: -7.0 },
    { row: 2, floorY: 3.0, z: 1.0 },
    { row: 3, floorY: 4.5, z: 9.0 },
    { row: 4, floorY: 6.0, z: 17.0 },
    { row: 5, floorY: 7.5, z: 25.0 }
  ];

  // 좌측 5석, 우측 5석 (중앙 통로 폭 약 16유닛: X in [-8, 8] 통로 확보)
  const colX = [-36, -30, -24, -18, -12, 12, 18, 24, 30, 36];

  let chairCount = 0;
  rowConfig.forEach(r => {
    colX.forEach(cx => {
      const cy = r.floorY;
      const cz = r.z;

      // A. 등받이 (Backrest) - 직립형 붉은 벽돌색 (정확히 60개 생성)
      addBox(4.2, 3.2, 0.6, chairFabricMat, cx, cy + 2.4, cz + 0.9, { collide: false, sample: true });

      // B. 접힌 방석 (Folded Seat Cushion) - 위로 접혀 올라간 쿠션 (정확히 60개 생성)
      // 등받이 바로 앞쪽에 밀착되어 위로 세워진 접힌 형태 (지우개가 쏙 들어가는 틈새 형성)
      addBox(3.8, 2.6, 0.7, chairFoldMat, cx, cy + 2.0, cz + 0.3, { collide: false, sample: true });

      // C. 철제 다리 프레임 및 팔걸이 (좌우 2개) - 충돌체 없이 장식용
      addBox(0.3, 2.0, 2.4, chairFrameMat, cx - 2.0, cy + 1.0, cz, { collide: false, sample: false });
      addBox(0.3, 2.0, 2.4, chairFrameMat, cx + 2.0, cy + 1.0, cz, { collide: false, sample: false });
      // 팔걸이 상판
      addBox(0.5, 0.25, 2.2, chairFrameMat, cx - 2.0, cy + 2.1, cz, { collide: false, sample: false });
      addBox(0.5, 0.25, 2.2, chairFrameMat, cx + 2.0, cy + 2.1, cz, { collide: false, sample: false });

      chairCount++;
    });

    // 행 단위 등받이 충돌체 (좌측 블록 5석, 우측 블록 5석)
    // 개별 의자 60개에 무거운 AABB를 난립시키지 않고, 행별 블록 충돌체로 성능 및 하부 은신 보존
    addAABBCollider(-24, r.floorY + 2.4, r.z + 0.9, 29.0, 3.2, 1.2);
    addAABBCollider(24, r.floorY + 2.4, r.z + 0.9, 29.0, 3.2, 1.2);
  });

  // ─────────────────────────────────────────────────────────────────
  // 6. 흡음재 벽면 패널 & 무대 양옆 방음문 2개
  // ─────────────────────────────────────────────────────────────────
  // 좌우 벽면 흡음 패널
  for (let z = -30; z <= 30; z += 15) {
    addBox(0.4, 16, 10, acousticMat, -ROOM_W / 2 + 0.3, 14, z, { collide: false, sample: true });
    addBox(0.4, 16, 10, acousticMat, ROOM_W / 2 - 0.3, 14, z, { collide: false, sample: true });
  }
  // 후방 벽면 흡음 패널
  for (let x = -40; x <= 40; x += 20) {
    addBox(14, 14, 0.4, acousticMat, x, 18, ROOM_D / 2 - 0.3, { collide: false, sample: true });
  }

  // 무대 양옆 두꺼운 이중 방음문 2개 (X = ±45, Z = -44.0)
  [-45, 45].forEach(dx => {
    // 도어 프레임 및 문짝
    addBox(6.0, 7.5, 1.2, soundproofDoorMat, dx, 3.75, -44.0, { collide: false, sample: true });
    // 도어 손잡이
    addBox(0.3, 1.2, 0.4, chairFrameMat, dx + (dx < 0 ? 2.2 : -2.2), 3.8, -43.3, { collide: false, sample: false });
    addAABBCollider(dx, 3.75, -44.0, 6.2, 7.6, 1.4);
  });

  // ─────────────────────────────────────────────────────────────────
  // 7. 천장 빔프로젝터 및 광선 연출 (Projector & Beam)
  // ─────────────────────────────────────────────────────────────────
  const projY = 24;
  const projZ = 5;
  // 프로젝터 본체 및 렌즈
  addBox(4.0, 1.6, 3.5, soundproofDoorMat, 0, projY, projZ, { collide: false, sample: true });
  const projLens = addCyl(0.6, 0.8, chairFrameMat, 0, projY, projZ - 1.8, { collide: false, sample: false, rx: Math.PI / 2 });

  // 스크린 방향을 향하는 반투명 피라미드 광선
  const beamGeom = trackGeom(new THREE.CylinderGeometry(0.8, 18, 48, 4, 1, true));
  const beamMat = trackMat(new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false
  }));
  const beam = new THREE.Mesh(beamGeom, beamMat);
  beam.rotation.x = Math.PI / 2.3;
  beam.position.set(0, 17, -20);
  mapRoot.add(beam);
  avGimmickState.beamMesh = beam;

  // ─────────────────────────────────────────────────────────────────
  // 8. 후방 음향 조정 콘솔 데스크 (리필존)
  // ─────────────────────────────────────────────────────────────────
  // 6단 상판(y=7.5) 위 우측 후방 (X: 44, Z: 33)
  addBox(10, 2.4, 6, consoleWoodMat, 44, 8.7, 33, { collide: false, sample: true });
  // 모니터 2대 및 믹서 콘솔
  addBox(3.0, 2.0, 0.4, chairFrameMat, 42, 10.8, 32, { collide: false, sample: false });
  addBox(3.0, 2.0, 0.4, chairFrameMat, 46, 10.8, 32, { collide: false, sample: false });
  addAABBCollider(44, 8.7, 33, 10.2, 2.5, 6.2);

  // 리필존 등록
  refillZones.push({ x: 44, z: 33, r: 6.5, label: "음향조정실" });

  // ─────────────────────────────────────────────────────────────────
  // 9. 스폰 지점 등록 (지우개 20개, 술래 6개 - 전부 y=0 바닥 및 AABB 겹침 0건)
  // ─────────────────────────────────────────────────────────────────
  const rawHiders = [
    // 1단 무대 앞 중앙 통로 (8개)
    [0.0, -17.0], [-4.0, -17.0], [4.0, -17.0], [-7.0, -17.0], [7.0, -17.0],
    [0.0, -12.5], [-5.0, -12.5], [5.0, -12.5],
    // 무대 좌측 통로 (4개)
    [-45.0, -36.0], [-40.0, -30.0], [-46.0, -25.0], [-41.0, -20.0],
    // 무대 우측 통로 (4개)
    [45.0, -36.0], [40.0, -30.0], [46.0, -25.0], [41.0, -20.0],
    // 좌석 좌측 외곽 통로 (2개)
    [-54.0, -6.0], [-54.0, 8.0],
    // 좌석 우측 외곽 통로 (2개)
    [54.0, -6.0], [54.0, 8.0]
  ];

  const rawSeekers = [
    [0.0, -15.0],   // 1단 중앙 통로
    [-44.0, -32.0], // 좌측 무대 앞
    [44.0, -32.0],  // 우측 무대 앞
    [-54.0, 0.0],   // 좌측 외곽 복도
    [54.0, 0.0],    // 우측 외곽 복도
    [0.0, -13.5]    // 1단 무대 정면
  ];

  rawHiders.forEach(([x, z]) => hiderSpawns.push(new THREE.Vector3(x, 0, z)));
  rawSeekers.forEach(([x, z]) => seekerSpawns.push(new THREE.Vector3(x, 0, z)));
}

/**
 * 시청각실 매 프레임 기믹 갱신
 * @param {Object} ctx - 엔진 컨텍스트
 * @param {number} dt - 프레임 경과 시간 (초)
 */
export function updateAvRoomGimmicks(ctx, dt) {
  if (!dt) return;
  avGimmickState.animTime += dt;

  // 빔프로젝터 빛 미세 플리커 연출
  if (avGimmickState.beamMesh && avGimmickState.beamMesh.material) {
    const pulse = 0.075 + Math.sin(avGimmickState.animTime * 3.5) * 0.015;
    avGimmickState.beamMesh.material.opacity = pulse;
  }
}

/**
 * 시청각실 리소스 및 기믹 정리 (맵 전환 시 필수 호출)
 * @param {Object} ctx - 엔진 컨텍스트
 */
export function cleanupAvRoom(ctx) {
  // 1. 프로젝터 광선 메쉬 제거
  if (avGimmickState.beamMesh && ctx && ctx.mapRoot) {
    ctx.mapRoot.remove(avGimmickState.beamMesh);
    avGimmickState.beamMesh = null;
  }

  // 2. 전용 머티리얼 해제
  avGimmickState.disposableMaterials.forEach(m => {
    if (m && typeof m.dispose === "function") {
      m.dispose();
    }
  });
  avGimmickState.disposableMaterials = [];

  // 3. 전용 지오메트리 해제
  avGimmickState.disposableGeometries.forEach(g => {
    if (g && typeof g.dispose === "function") {
      g.dispose();
    }
  });
  avGimmickState.disposableGeometries = [];

  avGimmickState.animTime = 0;
}
