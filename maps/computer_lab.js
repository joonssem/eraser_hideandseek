/**
 * 🖥️ maps/computer_lab.js - 컴퓨터실 (Computer Lab)
 * 
 * 《교실 대소동: 사라진 지우개 찾기》 독립 맵 모듈
 * - 의존성 주입(ctx) 패턴 준수
 * - setWallHeight(26) 계약 준수 (엔진 공통 규격 ROOM_W=120, ROOM_D=90)
 * - Zero-Asset 원칙: Three.js 절차적 지오메트리 & 2D Canvas 텍스처
 * - 표준 생명주기: COMPUTER_LAB_MAP, buildComputerLab, updateComputerLabGimmicks, cleanupComputerLab
 */

export const COMPUTER_LAB_MAP = {
  id: "computer_lab",
  name: "컴퓨터실",
  icon: "🖥️"
};

// 기믹 및 리소스 상태 관리 (모듈 내부 격리)
let compGimmickState = {
  disposableMaterials: [],
  disposableGeometries: [],
  animTime: 0
};

/**
 * 컴퓨터실 3D 공간 생성
 * @param {Object} ctx - 엔진 주입 컨텍스트
 */
export function buildComputerLab(ctx) {
  const {
    THREE, mapRoot, ROOM_W, ROOM_D,
    addBox, addCyl, canvasTex, lambert,
    addAABBCollider, samplables, colliders,
    refillZones, hiderSpawns, seekerSpawns,
    buildRoomShell, setWallHeight
  } = ctx;

  // 1. 벽 높이 설정 계약 (26 유닛)
  const WALL_H = 26;
  if (typeof setWallHeight === "function") {
    setWallHeight(WALL_H);
  }

  // 리소스 추적 헬퍼
  const trackMat = (mat) => {
    compGimmickState.disposableMaterials.push(mat);
    return mat;
  };
  const trackGeom = (geom) => {
    compGimmickState.disposableGeometries.push(geom);
    return geom;
  };

  // ─────────────────────────────────────────────────────────────────
  // 2. 머티리얼 및 텍스처 정의 (컴퓨터실 전용 Zero-Asset 팔레트)
  // ─────────────────────────────────────────────────────────────────
  // 바닥 비닐 디럭스 타일 텍스처 (라이트 그레이/베이지 사각 타일 패턴)
  const floorTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#d1ccc0";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(160, 155, 145, 0.45)";
    g.lineWidth = 2;
    for (let x = 0; x <= w; x += 64) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
    }
    for (let y = 0; y <= h; y += 64) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }
    // 타일 내 미세한 스페클 질감
    g.fillStyle = "rgba(255, 255, 255, 0.25)";
    g.fillRect(10, 10, 44, 44);
    g.fillRect(74, 74, 44, 44);
  }, 4, 3);

  // 모니터 화면 텍스처 (코딩 에디터 & 푸른 UI 텍스처)
  const monitorTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = "#1e1e2e";
    g.fillRect(0, 0, w, h);
    // 코드 라인 시각화
    const colors = ["#89b4fa", "#a6e3a1", "#f9e2af", "#f38ba8", "#cdd6f4"];
    for (let y = 14; y < h - 10; y += 10) {
      const lineLen = 20 + ((y * 17) % 80);
      g.fillStyle = colors[(y / 10) % colors.length];
      g.fillRect(12, y, lineLen, 5);
    }
  });

  const floorMat = trackMat(lambert({ map: floorTex }));
  const deskWoodMat = trackMat(lambert({ color: 0x6e4727 }));      // 책상 갈색 목재
  const monitorBezelMat = trackMat(lambert({ color: 0x1f1f1f }));  // 모니터 베젤 블랙
  const monitorScreenMat = trackMat(lambert({ map: monitorTex })); // 모니터 화면
  const towerMat = trackMat(lambert({ color: 0x2e2e2e }));         // 타워 본체 스틸
  const keyboardMat = trackMat(lambert({ color: 0x111111 }));      // 키보드 키캡
  const mousepadMat = trackMat(lambert({ color: 0x1d3557 }));      // 마우스패드 블루
  const chairCushionMat = trackMat(lambert({ color: 0x264653 }));  // 의자 좌판
  const chairFrameMat = trackMat(lambert({ color: 0x141414 }));    // 의자 스틸 프레임
  const cableMat = trackMat(lambert({ color: 0x0a0a0a }));         // 케이블 뭉치
  const screenMat = trackMat(lambert({ color: 0xf4f1de }));        // 프로젝터 스크린
  const teacherDeskMat = trackMat(lambert({ color: 0x5a3618 }));   // 교탁 짙은 원목

  // 룸 쉘 생성 (밝은 IT 교실 벽면 & 비닐 타일 바닥)
  buildRoomShell(floorMat, 0xdfdad0, 0xf0ede6, 0x5a3618);

  // ─────────────────────────────────────────────────────────────────
  // 3. 전면 교사 구역 및 대형 프로젝터 스크린
  // ─────────────────────────────────────────────────────────────────
  // 교사용 데스크 & 교탁: 중심 (0, 1.4, -34), 너비 14, 깊이 4.5, 높이 2.8
  addBox(14, 2.8, 4.5, teacherDeskMat, 0, 1.4, -34, { collide: false, sample: true });
  addAABBCollider(0, 1.4, -34, 14, 2.8, 4.5);

  // 교사용 PC 세트
  addBox(4.5, 2.7, 0.3, monitorBezelMat, 0, 4.2, -34.8, { collide: false, sample: true });
  addBox(1.4, 2.0, 3.2, towerMat, 5.0, 1.0, -34, { collide: false, sample: true });
  addBox(3.4, 0.12, 1.4, keyboardMat, 0, 2.9, -33.2, { collide: false, sample: true });

  // 전면 대형 프로젝터 스크린 (폭 45, 높이 18, 중심 Z = -44.2)
  addBox(45, 18, 0.4, screenMat, 0, 15, -44.2, { collide: false, sample: true });
  addBox(46, 0.8, 0.8, monitorBezelMat, 0, 5.6, -44.2, { collide: false, sample: false });
  addBox(46, 1.0, 1.0, monitorBezelMat, 0, 24.2, -44.2, { collide: false, sample: false });
  addAABBCollider(0, 15, -44.2, 45, 18, 0.6);

  // 천장 빔프로젝터 (0, 22, -15)
  addBox(4.0, 1.6, 3.5, towerMat, 0, 22, -15, { collide: false, sample: true });
  const projLens = addCyl(0.6, 0.8, chairFrameMat, 0, 22, -16.8, { collide: false, sample: false, rx: Math.PI / 2 });

  // 교사 연구대 리필존 등록
  refillZones.push({ x: 15, z: -34, r: 6.0, label: "교사연구대" });

  // ─────────────────────────────────────────────────────────────────
  // 4. 학생 PC 좌석 24석 (좌측 12석, 우측 12석)
  // ─────────────────────────────────────────────────────────────────
  // 중앙 통로: X in [-9.0, 9.0] (최소 폭 18.0 units 엄격 보장)
  // 4행 x 3열: Row Z = [-16, -2, 12, 26]
  const rowZ = [-16.0, -2.0, 12.0, 26.0];
  const leftColX = [-45.0, -31.0, -17.0];
  const rightColX = [17.0, 31.0, 45.0];

  let leftCount = 0;
  let rightCount = 0;

  // 24석 생성 루프
  rowZ.forEach(rz => {
    [...leftColX, ...rightColX].forEach(cx => {
      const isLeft = cx < 0;
      if (isLeft) leftCount++; else rightCount++;

      // A. 책상 상판 (너비 8.0, 두께 0.4, 깊이 3.6, y = 2.8)
      addBox(8.0, 0.4, 3.6, deskWoodMat, cx, 2.8, rz, { collide: false, sample: true });
      addAABBCollider(cx, 2.8, rz, 8.0, 0.4, 3.6);

      // B. 책상 좌우 다리 패널 (두께 0.3, 높이 2.6, 깊이 3.4)
      addBox(0.3, 2.6, 3.4, deskWoodMat, cx - 3.75, 1.3, rz, { collide: false, sample: true });
      addBox(0.3, 2.6, 3.4, deskWoodMat, cx + 3.75, 1.3, rz, { collide: false, sample: true });
      addAABBCollider(cx - 3.75, 1.3, rz, 0.3, 2.6, 3.4);
      addAABBCollider(cx + 3.75, 1.3, rz, 0.3, 2.6, 3.4);

      // C. 16:9 슬림 모니터 & 스탠드 (너비 4.0, 높이 2.4, 깊이 0.25)
      // 모니터 베젤 및 화면 메쉬
      addBox(4.0, 2.4, 0.25, monitorBezelMat, cx, 4.2, rz - 0.8, { collide: false, sample: true });
      addBox(3.7, 2.1, 0.05, monitorScreenMat, cx, 4.2, rz - 0.65, { collide: false, sample: true });
      // 모니터 스탠드 기둥 & 베이스 (뒤편 은신 공간 확보)
      addBox(0.5, 1.0, 0.3, monitorBezelMat, cx, 3.3, rz - 0.9, { collide: false, sample: false });
      addBox(2.0, 0.1, 1.4, monitorBezelMat, cx, 3.05, rz - 0.9, { collide: false, sample: false });

      // D. 타워형 PC 본체 (너비 1.2, 높이 1.8, 깊이 2.6) - 책상 아래 우측 바닥
      const towerX = cx + 2.6;
      const towerZ = rz - 0.2;
      addBox(1.2, 1.8, 2.6, towerMat, towerX, 0.9, towerZ, { collide: false, sample: true });
      addAABBCollider(towerX, 0.9, towerZ, 1.2, 1.8, 2.6);

      // E. 케이블 뭉치 (본체 뒷면 배선 표현)
      addBox(0.8, 0.6, 0.6, cableMat, towerX, 0.4, rz - 1.4, { collide: false, sample: true });

      // F. 마우스패드 & 키보드
      addBox(2.0, 0.04, 1.6, mousepadMat, cx + 2.0, 3.02, rz + 0.5, { collide: false, sample: true });
      addBox(3.4, 0.12, 1.2, keyboardMat, cx - 0.8, 3.06, rz + 0.5, { collide: false, sample: true });

      // G. 사무용 회전 바퀴의자 (책상 뒤편 rz + 2.3)
      const chairZ = rz + 2.3;
      // 좌판 쿠션 (너비 2.6, 깊이 2.6, 두께 0.4, y = 1.6)
      addBox(2.6, 0.4, 2.6, chairCushionMat, cx, 1.6, chairZ, { collide: false, sample: true });
      // 등받이 (너비 2.4, 높이 2.2, 두께 0.3, y = 2.8)
      addBox(2.4, 2.2, 0.3, chairCushionMat, cx, 2.8, chairZ + 1.1, { collide: false, sample: true });
      // 오발 다리 및 중심 가스쇼바 기둥
      addCyl(0.2, 0.8, chairFrameMat, cx, 0.8, chairZ, { collide: false, sample: false });
      addBox(2.6, 0.15, 0.3, chairFrameMat, cx, 0.3, chairZ, { collide: false, sample: false });
      addBox(0.3, 0.15, 2.6, chairFrameMat, cx, 0.3, chairZ, { collide: false, sample: false });
      // 의자 좌판 최소 충돌체
      addAABBCollider(cx, 1.8, chairZ, 2.6, 1.6, 2.6);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 5. 스폰 지점 등록 (지우개 20개, 술래 6개 - 전부 y=0 바닥 및 AABB 겹침 0건)
  // ─────────────────────────────────────────────────────────────────
  const rawSeekers = [
    [0.0, -22.0],  // 중앙 통로 전방
    [0.0, 0.0],    // 중앙 통로 중앙
    [0.0, 22.0],   // 중앙 통로 후방
    [0.0, 38.0],   // 후방 통로 중앙
    [-54.0, 0.0],  // 좌측 외곽 통로
    [54.0, 0.0]    // 우측 외곽 통로
  ];

  const rawHiders = [
    // 중앙 통로 주변 안전 지점 (X in [-5, 5])
    [0.0, -16.0], [0.0, -8.0], [0.0, -2.0], [0.0, 6.0], [0.0, 12.0], [0.0, 26.0],
    // 좌측 외곽 통로 (X = -54)
    [-54.0, -25.0], [-54.0, -16.0], [-54.0, 12.0], [-54.0, 26.0],
    // 우측 외곽 통로 (X = 54)
    [54.0, -25.0], [54.0, -16.0], [54.0, 12.0], [54.0, 26.0],
    // 후방 복도 (Z = 38)
    [-30.0, 38.0], [30.0, 38.0],
    // 전면 교사 구역 통로 (Z = -25)
    [-25.0, -25.0], [25.0, -25.0],
    // 행간 통로 (Z = 5.0)
    [-24.0, 5.0], [24.0, 5.0]
  ];

  rawHiders.forEach(([x, z]) => hiderSpawns.push(new THREE.Vector3(x, 0, z)));
  rawSeekers.forEach(([x, z]) => seekerSpawns.push(new THREE.Vector3(x, 0, z)));
}

/**
 * 컴퓨터실 매 프레임 기믹 갱신 (안전한 noop)
 * @param {Object} ctx - 엔진 컨텍스트
 * @param {number} dt - 프레임 경과 시간 (초)
 */
export function updateComputerLabGimmicks(ctx, dt) {
  if (!dt) return;
  compGimmickState.animTime += dt;
}

/**
 * 컴퓨터실 리소스 및 기믹 정리 (맵 전환 시 필수 호출)
 * @param {Object} ctx - 엔진 컨텍스트
 */
export function cleanupComputerLab(ctx) {
  // 1. 전용 머티리얼 중복 없는 안전 해제
  const disposedMats = new Set();
  compGimmickState.disposableMaterials.forEach(m => {
    if (m && typeof m.dispose === "function" && !disposedMats.has(m)) {
      disposedMats.add(m);
      m.dispose();
    }
  });
  compGimmickState.disposableMaterials = [];

  // 2. 전용 지오메트리 중복 없는 안전 해제
  const disposedGeoms = new Set();
  compGimmickState.disposableGeometries.forEach(g => {
    if (g && typeof g.dispose === "function" && !disposedGeoms.has(g)) {
      disposedGeoms.add(g);
      g.dispose();
    }
  });
  compGimmickState.disposableGeometries = [];

  compGimmickState.animTime = 0;
}
