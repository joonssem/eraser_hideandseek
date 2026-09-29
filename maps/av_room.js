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
  flickerBeam: null,
  stageLightBeams: [],
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
  // 3-1. 무대 좌측 검정 업라이트 피아노 (Upright Piano on Stage)
  // ─────────────────────────────────────────────────────────────────
  // 위치: 무대 좌측 x in [-28, -20], z in [-36, -28], y = 2.2 접지
  // 중심: (-24.0, 5.1, -32.0), AABB: min [-28, 2.2, -36], max [-20, 8.0, -28]
  const pianoBodyMat = trackMat(lambert({ color: 0x111116 }));
  const pianoKeyWhiteMat = trackMat(lambert({ color: 0xfafafa }));
  const pianoKeyBlackMat = trackMat(lambert({ color: 0x1a1a1a }));
  const pianoPedalMat = trackMat(lambert({ color: 0xd4af37 }));
  const sheetMusicMat = trackMat(lambert({ color: 0xffffff }));
  const pianoBenchMat = trackMat(lambert({ color: 0x222226 }));

  // 1) 피아노 바디 하부
  addBox(6.8, 3.2, 2.8, pianoBodyMat, -24.0, 2.2 + 1.6, -32.4, { collide: false, sample: true });
  // 2) 피아노 바디 상부 (음향판 및 상판)
  addBox(6.8, 2.6, 1.8, pianoBodyMat, -24.0, 2.2 + 3.2 + 1.3, -32.9, { collide: false, sample: true });
  // 3) 건반 베이스
  addBox(6.4, 0.4, 1.2, pianoBodyMat, -24.0, 2.2 + 3.0, -31.0, { collide: false, sample: true });
  // 4) 흑백 건반
  addBox(6.0, 0.12, 0.9, pianoKeyWhiteMat, -24.0, 2.2 + 3.25, -31.0, { collide: false, sample: true });
  addBox(5.6, 0.16, 0.55, pianoKeyBlackMat, -24.0, 2.2 + 3.32, -31.2, { collide: false, sample: true });
  // 5) 보면대 & 악보
  addBox(3.6, 1.2, 0.15, pianoBodyMat, -24.0, 2.2 + 4.2, -31.9, { collide: false, sample: true });
  addBox(2.8, 1.0, 0.05, sheetMusicMat, -24.0, 2.2 + 4.2, -31.8, { collide: false, sample: true });
  // 6) 황동 페달 3개
  [-24.6, -24.0, -23.4].forEach(px => {
    addBox(0.25, 0.15, 0.5, pianoPedalMat, px, 2.2 + 0.15, -30.8, { collide: false, sample: false });
  });
  // 7) 피아노 사각 의자 (피아노 앞쪽)
  addBox(3.4, 0.5, 1.6, pianoBenchMat, -24.0, 2.2 + 1.7, -29.2, { collide: false, sample: true });
  [[-25.5, -29.8], [-22.5, -29.8], [-25.5, -28.6], [-22.5, -28.6]].forEach(([bx, bz]) => {
    addBox(0.2, 1.4, 0.2, chairFrameMat, bx, 2.2 + 0.7, bz, { collide: false, sample: false });
  });

  // 피아노 본체 AABB 충돌체: 정확히 min [-28, 2.2, -36], max [-20, 8.0, -28] 보호
  addAABBCollider(-24.0, 5.1, -32.0, 8.0, 5.8, 8.0);

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

  // [P1] 펼쳐진 좌석 5석 (단차별 1석씩 분산: Row0 Col2, Row1 Col7, Row2 Col3, Row3 Col8, Row4 Col1)
  const unfoldedSeatKeys = new Set([
    "0,2", // Row0 Col2 (cx: -24, cy: 0.0)
    "1,7", // Row1 Col7 (cx:  24, cy: 1.5)
    "2,3", // Row2 Col3 (cx: -18, cy: 3.0)
    "3,8", // Row3 Col8 (cx:  30, cy: 4.5)
    "4,1"  // Row4 Col1 (cx: -30, cy: 6.0)
  ]);

  let chairCount = 0;
  let foldedCount = 0;
  let unfoldedCount = 0;

  rowConfig.forEach(r => {
    colX.forEach((cx, colIdx) => {
      const cy = r.floorY;
      const cz = r.z;
      const isUnfolded = unfoldedSeatKeys.has(`${r.row},${colIdx}`);

      // A. 등받이 (Backrest) - 직립형 붉은 벽돌색 (정확히 60개 생성)
      addBox(4.2, 3.2, 0.6, chairFabricMat, cx, cy + 2.4, cz + 0.9, { collide: false, sample: true });

      if (isUnfolded) {
        // [P1] 펼쳐진 좌판 (Unfolded Seat Cushion) - 수평 착석 상태 (정확히 5석)
        // 상단 높이: cy + 1.8 (y = 1.55 + 0.25 = 1.8), 지우개가 올라탈 수 있는 수평 발판
        addBox(3.8, 0.5, 2.4, chairFoldMat, cx, cy + 1.55, cz - 0.2, { collide: false, sample: true });
        // 착지 가능한 얇은 수평 AABB 발판 충돌체 (상단: cy + 1.8)
        addAABBCollider(cx, cy + 1.65, cz - 0.2, 3.8, 0.3, 2.4);
        unfoldedCount++;
      } else {
        // B. 접힌 방석 (Folded Seat Cushion) - 위로 접혀 올라간 쿠션 (정확히 55개 생성)
        // 등받이 바로 앞쪽에 밀착되어 위로 세워진 접힌 형태 (지우개가 쏙 들어가는 틈새 형성)
        addBox(3.8, 2.6, 0.7, chairFoldMat, cx, cy + 2.0, cz + 0.3, { collide: false, sample: true });
        foldedCount++;
      }

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

    // [P0] 의자 하부 베이스 프레임 블로커 (Base Blocker AABB)
    // 바닥면(floorY)부터 좌판 하단(floorY + 1.4)까지 하부 공간을 밀폐하여 의자 밑 파고들기 및 무적 클리핑 원천 차단
    addAABBCollider(-24, r.floorY + 0.7, r.z + 0.1, 29.0, 1.4, 2.6);
    addAABBCollider(24, r.floorY + 0.7, r.z + 0.1, 29.0, 1.4, 2.6);
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
  // 7-1. 프로젝터 라인 좌우 천장 무대 조명 6기 & 반도어 (P3 Stage Lights & Barn Doors)
  // ─────────────────────────────────────────────────────────────────
  // 프로젝터(Z=5, Y=24)와 동일 Z축 라인, 천장 트러스 바텐(Y=25.5)
  // 좌측 3기 (X = -36, -26, -16), 우측 3기 (X = 16, 26, 36)
  const stageLightMat = trackMat(lambert({ color: 0x1a1a20 }));      // 조명 캔 매트 블랙 스틸
  const barnDoorMat = trackMat(lambert({ color: 0x141416 }));        // 반도어 차광판 블랙
  const stageLensMat = trackMat(lambert({ color: 0xfff0c0, emissive: 0xffd166 })); // 렌즈 발광
  const stageBeamMat = trackMat(new THREE.MeshBasicMaterial({
    color: 0xfff3d6,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false
  }));
  const flickerBeamMat = trackMat(new THREE.MeshBasicMaterial({
    color: 0xffe8b0,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false
  }));

  // 좌우 천장 트러스 파이프 2개 (X=-26, X=26)
  addBox(24.0, 0.25, 0.25, chairFrameMat, -26.0, 25.5, 5.0, { collide: false, sample: false });
  addBox(24.0, 0.25, 0.25, chairFrameMat, 26.0, 25.5, 5.0, { collide: false, sample: false });

  const lightXPositions = [-36.0, -26.0, -16.0, 16.0, 26.0, 36.0];
  const lightY = 24.5;
  const lightZ = 5.0;

  // 조명 공유 지오메트리 (메모리 최적화)
  const canGeom = trackGeom(new THREE.CylinderGeometry(0.8, 0.8, 2.2, 12));
  const lensGeom = trackGeom(new THREE.CylinderGeometry(0.72, 0.72, 0.1, 12));
  const frameGeom = trackGeom(new THREE.BoxGeometry(1.8, 1.8, 0.08));
  const flapGeomH = trackGeom(new THREE.BoxGeometry(1.6, 0.04, 0.8)); // 상/하 차광판
  const flapGeomV = trackGeom(new THREE.BoxGeometry(0.04, 1.6, 0.8)); // 좌/우 차광판

  lightXPositions.forEach((lx, lIdx) => {
    // 천장 드롭 파이프
    addCyl(0.06, 1.1, chairFrameMat, lx, 25.2, lightZ, { collide: false, sample: false });

    // 무대 타겟 조준 (무대 상판 y=2.2, z=-30)
    const targetX = lx * 0.45;
    const targetY = 2.2;
    const targetZ = -30.0;

    const dx = targetX - lx;
    const dy = targetY - lightY;
    const dz = targetZ - lightZ;
    const dXZ = Math.hypot(dx, dz);
    const beamLen = Math.hypot(dXZ, dy) - 1.5;

    // 회전 각도 (로컬 -Z 방향을 타겟으로 정렬)
    const rotX = Math.atan2(dy, -dz);
    const rotY = Math.atan2(-dx, -dz);

    const lightGroup = (THREE.Group ? new THREE.Group() : new THREE.Mesh());
    lightGroup.position.set(lx, lightY, lightZ);
    lightGroup.rotation.set(rotX, rotY, 0);

    // 1) 조명 원통 캔 (직경 1.6, 길이 2.2)
    const canMesh = new THREE.Mesh(canGeom, stageLightMat);
    canMesh.rotation.x = Math.PI / 2;
    lightGroup.add(canMesh);
    samplables.push(canMesh);

    // 2) 발광 렌즈 (앞면 로컬 z = -1.1)
    const lensMesh = new THREE.Mesh(lensGeom, stageLensMat);
    lensMesh.rotation.x = Math.PI / 2;
    lensMesh.position.set(0, 0, -1.1);
    lightGroup.add(lensMesh);
    samplables.push(lensMesh);

    // 3) 반도어 마운트 프레임 (사각 테두리)
    const frameMesh = new THREE.Mesh(frameGeom, barnDoorMat);
    frameMesh.position.set(0, 0, -1.15);
    lightGroup.add(frameMesh);
    samplables.push(frameMesh);

    // 4) 반도어 4방향 플랩 (상/하/좌/우 바깥쪽 약 30도 전개)
    // 상단 플랩
    const flapTop = new THREE.Mesh(flapGeomH, barnDoorMat);
    flapTop.position.set(0, 0.95, -1.4);
    flapTop.rotation.x = -0.52;
    lightGroup.add(flapTop);
    samplables.push(flapTop);

    // 하단 플랩
    const flapBottom = new THREE.Mesh(flapGeomH, barnDoorMat);
    flapBottom.position.set(0, -0.95, -1.4);
    flapBottom.rotation.x = 0.52;
    lightGroup.add(flapBottom);
    samplables.push(flapBottom);

    // 좌측 플랩
    const flapLeft = new THREE.Mesh(flapGeomV, barnDoorMat);
    flapLeft.position.set(-0.95, 0, -1.4);
    flapLeft.rotation.y = 0.52;
    lightGroup.add(flapLeft);
    samplables.push(flapLeft);

    // 우측 플랩
    const flapRight = new THREE.Mesh(flapGeomV, barnDoorMat);
    flapRight.position.set(0.95, 0, -1.4);
    flapRight.rotation.y = -0.52;
    lightGroup.add(flapRight);
    samplables.push(flapRight);

    // 5) 반투명 원뿔형 빔 (Cone / Cylinder)
    const isFlicker = (lIdx === 0); // 좌측 1번 조명 (lx = -36) 고장 깜빡임
    const beamGeom = trackGeom(new THREE.CylinderGeometry(0.7, 5.2, beamLen, 16, 1, true));
    const beamMesh = new THREE.Mesh(beamGeom, isFlicker ? flickerBeamMat : stageBeamMat);
    beamMesh.rotation.x = -Math.PI / 2;
    beamMesh.position.set(0, 0, -1.1 - beamLen / 2);
    lightGroup.add(beamMesh);

    if (isFlicker) {
      avGimmickState.flickerBeam = beamMesh;
    }
    avGimmickState.stageLightBeams.push(beamMesh);

    mapRoot.add(lightGroup);
  });

  // ─────────────────────────────────────────────────────────────────
  // 8. 후방 음향 조정 콘솔 데스크 (리필존) & [P1 보완] 음향 랙·믹서·마이크
  // ─────────────────────────────────────────────────────────────────
  // 6단 상판(y=7.5) 위 우측 후방 (X: 44, Z: 33)
  addBox(10, 2.4, 6, consoleWoodMat, 44, 8.7, 33, { collide: false, sample: true });
  // 모니터 2대
  addBox(3.0, 2.0, 0.4, chairFrameMat, 42, 10.8, 32, { collide: false, sample: false });
  addBox(3.0, 2.0, 0.4, chairFrameMat, 46, 10.8, 32, { collide: false, sample: false });
  addAABBCollider(44, 8.7, 33, 10.2, 2.5, 6.2);

  // 음향 전용 머티리얼 (추적 등록)
  const rackMat = trackMat(lambert({ color: 0x1a1a20 }));
  const rackPanelMat = trackMat(lambert({ color: 0x282834 }));
  const mixerBodyMat = trackMat(lambert({ color: 0x22222a }));
  const knobCyanMat = trackMat(lambert({ color: 0x38bdf8 }));
  const knobRedMat = trackMat(lambert({ color: 0xf87171 }));
  const micBodyMat = trackMat(lambert({ color: 0x2a2a2a }));
  const micGrillMat = trackMat(lambert({ color: 0x9ca3af }));

  // [P1 보완 1] 데스크 오른쪽 별도 음향 장비 랙 (Equipment Rack)
  // 위치: 중심 (52.5, 10.25, 33.0), AABB: min [50.5, 7.5, 31], max [54.5, 13, 35]
  // 바닥 y=7.5에 접지, 방 경계 내부 안착, 데스크 AABB(X: 38.9~49.1)와 분리
  addBox(3.8, 5.4, 3.8, rackMat, 52.5, 10.2, 33.0, { collide: false, sample: true });

  // 랙 전면 유닛 패널들 (Z=31.05 방향)
  // 상단: 무선 마이크 수신기 (디스플레이 + 안테나 2개)
  addBox(3.4, 0.8, 0.15, rackPanelMat, 52.5, 12.2, 31.05, { collide: false, sample: true });
  addBox(1.2, 0.35, 0.05, trackMat(lambert({ color: 0x00e5ff })), 52.5, 12.2, 30.95, { collide: false, sample: false });
  addCyl(0.04, 0.6, chairFrameMat, 51.5, 12.8, 31.05, { collide: false, sample: false });
  addCyl(0.04, 0.6, chairFrameMat, 53.5, 12.8, 31.05, { collide: false, sample: false });

  // 중단: 파워 앰프 2단 (듀얼 볼륨 다이얼)
  addBox(3.4, 1.2, 0.15, rackPanelMat, 52.5, 10.8, 31.05, { collide: false, sample: true });
  addCyl(0.12, 0.1, micGrillMat, 51.8, 10.8, 30.95, { collide: false, sample: false, rx: Math.PI / 2 });
  addCyl(0.12, 0.1, micGrillMat, 53.2, 10.8, 30.95, { collide: false, sample: false, rx: Math.PI / 2 });

  // 하단: 패치 패널 및 케이블 매니저
  addBox(3.4, 0.8, 0.15, rackPanelMat, 52.5, 9.4, 31.05, { collide: false, sample: true });

  // 랙 외곽 AABB 충돌체 등록 (min [50.5, 7.5, 31], max [54.5, 13, 35])
  addAABBCollider(52.5, 10.25, 33.0, 4.0, 5.5, 4.0);

  // [P1 보완 2] 데스크 위 믹서 콘솔 (Mixer Console)
  // 위치: (44.0, 10.05, 34.0), 크기: 4.8 x 0.3 x 2.2, 페이더 4개 및 노브 식별
  addBox(4.8, 0.3, 2.2, mixerBodyMat, 44.0, 10.05, 34.0, { collide: false, sample: true });
  [-1.4, -0.5, 0.5, 1.4].forEach(dx => {
    // 채널 페이더 슬롯
    addBox(0.15, 0.08, 0.7, rackMat, 44.0 + dx, 10.22, 34.4, { collide: false, sample: false });
    // 채널 컬러 노브 (Cyan/Red)
    addCyl(0.08, 0.1, knobCyanMat, 44.0 + dx, 10.24, 33.7, { collide: false, sample: false });
    addCyl(0.08, 0.1, knobRedMat, 44.0 + dx, 10.24, 33.3, { collide: false, sample: false });
  });

  // [P1 보완 3] 마이크 2개 및 마이크 스탠드 1개
  // A. 마이크 스탠드 & 1번 거치 마이크 (데스크 좌측 모서리 X=40.2, Z=35.0)
  addCyl(0.35, 0.06, chairFrameMat, 40.2, 9.93, 35.0, { collide: false, sample: false });
  addCyl(0.05, 1.4, chairFrameMat, 40.2, 10.65, 35.0, { collide: false, sample: false });
  addBox(0.2, 0.2, 0.25, chairFrameMat, 40.2, 11.35, 35.0, { collide: false, sample: false });
  addCyl(0.1, 0.55, micBodyMat, 40.2, 11.45, 34.9, { collide: false, sample: true, rx: Math.PI / 4 });
  addCyl(0.14, 0.22, micGrillMat, 40.2, 11.68, 34.68, { collide: false, sample: true });

  // B. 2번 핸드 마이크 (믹서 옆 데스크 위에 비스듬히 놓임)
  addCyl(0.1, 0.65, micBodyMat, 47.6, 10.02, 34.5, { collide: false, sample: true, rz: Math.PI / 2, ry: 0.35 });
  addCyl(0.14, 0.22, micGrillMat, 47.2, 10.02, 34.36, { collide: false, sample: true, rz: Math.PI / 2, ry: 0.35 });

  // 랙과 데스크 사이 정돈된 오디오 케이블
  addBox(0.15, 0.08, 2.5, rackMat, 49.6, 9.95, 33.5, { collide: false, sample: false });

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

  // 1. 빔프로젝터 빛 미세 플리커 연출
  if (avGimmickState.beamMesh && avGimmickState.beamMesh.material) {
    const pulse = 0.075 + Math.sin(avGimmickState.animTime * 3.5) * 0.015;
    avGimmickState.beamMesh.material.opacity = pulse;
  }

  // 2. 좌측 1번 무대 조명 불규칙 깜빡임(Flicker / Broken) 연출
  if (avGimmickState.flickerBeam && avGimmickState.flickerBeam.material) {
    const t = avGimmickState.animTime;
    const noise = Math.sin(t * 13.7) * 0.5 + Math.sin(t * 29.3) * 0.3 + Math.cos(t * 7.1) * 0.2;
    let flickerOpacity = 0.14;
    if (noise > 0.45) {
      flickerOpacity = 0.22;
    } else if (noise < -0.3) {
      flickerOpacity = (noise < -0.6) ? 0.01 : 0.04;
    } else {
      flickerOpacity = 0.12 + noise * 0.05;
    }
    avGimmickState.flickerBeam.material.opacity = Math.max(0.0, Math.min(0.25, flickerOpacity));
  }
}

/**
 * 시청각실 리소스 및 기믹 정리 (맵 전환 시 필수 호출)
 * @param {Object} ctx - 엔진 컨텍스트
 */
export function cleanupAvRoom(ctx) {
  // 1. 프로젝터 및 무대 조명 광선 메쉬 제거
  if (avGimmickState.beamMesh && ctx && ctx.mapRoot) {
    ctx.mapRoot.remove(avGimmickState.beamMesh);
    avGimmickState.beamMesh = null;
  }

  avGimmickState.stageLightBeams = [];
  avGimmickState.flickerBeam = null;

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
