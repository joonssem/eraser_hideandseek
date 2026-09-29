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
  disposableTextures: [],
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
  const trackTex = (tex) => {
    compGimmickState.disposableTextures.push(tex);
    return tex;
  };

  // ─────────────────────────────────────────────────────────────────
  // 2. 머티리얼 및 텍스처 정의 (컴퓨터실 전용 Zero-Asset 팔레트)
  // ─────────────────────────────────────────────────────────────────
  // 바닥 비닐 디럭스 타일 텍스처 (라이트 그레이/베이지 사각 타일 패턴)
  const floorTex = trackTex(canvasTex(256, 256, (g, w, h) => {
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
  }, 4, 3));

  // ─────────────────────────────────────────────────────────────────
  // 2-1. 모니터 6종 화면 CanvasTexture & 전원 상태 머티리얼 (P3)
  // ─────────────────────────────────────────────────────────────────
  // 0: 코딩 에디터 화면 (VS Code 다크 테마 + 컬러 코드 라인)
  const texCoding = trackTex(canvasTex(256, 144, (g, w, h) => {
    g.fillStyle = "#1e1e2e";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#181825";
    g.fillRect(0, 0, 36, h);
    g.fillStyle = "#45475a";
    g.fillRect(6, 10, 24, 6);
    g.fillRect(10, 22, 16, 4);
    const codeColors = ["#89b4fa", "#a6e3a1", "#f9e2af", "#f38ba8", "#cdd6f4", "#fab387"];
    for (let y = 14; y < h - 10; y += 11) {
      const indent = ((y * 7) % 3) * 16 + 46;
      const len = 30 + ((y * 23) % 120);
      g.fillStyle = codeColors[(y / 11) % codeColors.length];
      g.fillRect(indent, y, len, 6);
    }
  }));

  // 1: 한글/문서 작성 화면 (화이트 배경 + 파란 리본 메뉴, 강한 발광)
  const texDocument = trackTex(canvasTex(256, 144, (g, w, h) => {
    g.fillStyle = "#e2e8f0";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1d4ed8";
    g.fillRect(0, 0, w, 22);
    g.fillStyle = "#ffffff";
    g.fillRect(12, 6, 28, 10);
    g.fillRect(46, 6, 28, 10);
    g.fillRect(24, 28, w - 48, h - 36);
    g.fillStyle = "#334155";
    g.fillRect(36, 38, 110, 10);
    g.fillStyle = "#94a3b8";
    for (let y = 56; y < h - 16; y += 9) {
      const len = 120 + ((y * 19) % 70);
      g.fillRect(36, y, len, 4);
    }
  }));

  // 2: 그림판 화면 (화이트 캔버스 + 상단 팔레트 + 원색 브러시 낙서)
  const texPaint = trackTex(canvasTex(256, 144, (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#f1f5f9";
    g.fillRect(0, 0, w, 24);
    const palColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#000000"];
    palColors.forEach((c, idx) => {
      g.fillStyle = c;
      g.fillRect(10 + idx * 16, 5, 12, 14);
    });
    g.lineWidth = 5;
    g.strokeStyle = "#3b82f6";
    g.beginPath(); g.arc(80, 80, 32, 0, Math.PI * 1.5); g.stroke();
    g.strokeStyle = "#ef4444";
    g.beginPath(); g.moveTo(110, 60); g.lineTo(190, 110); g.lineTo(220, 70); g.stroke();
    g.fillStyle = "#eab308";
    g.beginPath(); g.arc(180, 65, 18, 0, Math.PI * 2); g.fill();
  }));

  // 3: 웹 브라우저/포털 화면 (검색창 바 + 콘텐츠 카드 그리드)
  const texBrowser = trackTex(canvasTex(256, 144, (g, w, h) => {
    g.fillStyle = "#f8fafc";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#0284c7";
    g.fillRect(0, 0, w, 22);
    g.fillStyle = "#ffffff";
    g.fillRect(30, 4, w - 60, 14);
    g.strokeStyle = "#0284c7";
    g.lineWidth = 2;
    g.strokeRect(36, 32, w - 72, 20);
    const cardColors = ["#bae6fd", "#fed7aa", "#bbf7d0", "#fbcfe8"];
    for (let i = 0; i < 4; i++) {
      const cx = 20 + i * 56;
      g.fillStyle = cardColors[i];
      g.fillRect(cx, 62, 48, 40);
      g.fillStyle = "#64748b";
      g.fillRect(cx, 108, 44, 5);
    }
  }));

  // 4: 스크래치 블록 코딩 화면 (다채로운 블록 스택 + 캣 윈도우)
  const texScratch = trackTex(canvasTex(256, 144, (g, w, h) => {
    g.fillStyle = "#f0f2f5";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#4d97ff";
    g.fillRect(0, 0, w, 18);
    const blockColors = ["#ffab19", "#4c97ff", "#9966ff", "#59c059", "#ff6680"];
    blockColors.forEach((bc, idx) => {
      g.fillStyle = bc;
      g.fillRect(20, 28 + idx * 18, 90, 14);
    });
    g.fillStyle = "#ffffff";
    g.strokeStyle = "#cbd5e1";
    g.lineWidth = 2;
    g.fillRect(130, 28, 110, 95);
    g.strokeRect(130, 28, 110, 95);
    g.fillStyle = "#ffab19";
    g.beginPath(); g.arc(185, 75, 20, 0, Math.PI * 2); g.fill();
  }));

  // 5: 바탕화면 위젯 화면 (청록 윈도우 배경 + 아이콘 그리드 + 작업표시줄)
  const texDesktop = trackTex(canvasTex(256, 144, (g, w, h) => {
    g.fillStyle = "#0f766e";
    g.fillRect(0, 0, w, h);
    const iconColors = ["#f59e0b", "#3b82f6", "#ec4899", "#10b981", "#8b5cf6", "#f43f5e"];
    iconColors.forEach((ic, idx) => {
      const ix = 16 + (idx % 2) * 28;
      const iy = 14 + Math.floor(idx / 2) * 32;
      g.fillStyle = ic;
      g.fillRect(ix, iy, 18, 18);
    });
    g.fillStyle = "#111827";
    g.fillRect(0, h - 16, w, 16);
    g.fillStyle = "#0284c7";
    g.fillRect(6, h - 13, 14, 10);
  }));

  // 절전 모드 화면 (Sleep Mode)
  const texSleep = trackTex(canvasTex(256, 144, (g, w, h) => {
    g.fillStyle = "#08080a";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#f97316";
    g.font = "bold 14px sans-serif";
    g.textAlign = "center";
    g.fillText("⚡ 절전 모드 (대기 중)", w / 2, 75);
    g.beginPath(); g.arc(w - 16, h - 14, 4, 0, Math.PI * 2); g.fill();
  }));

  // 켜진 화면 머티리얼 6종 (emissive 적용)
  const onScreenMats = [
    trackMat(lambert({ map: texCoding, emissive: 0x2a2a2a, emissiveMap: texCoding })),
    trackMat(lambert({ map: texDocument, emissive: 0x3a3a3a, emissiveMap: texDocument })),
    trackMat(lambert({ map: texPaint, emissive: 0x2a2a2a, emissiveMap: texPaint })),
    trackMat(lambert({ map: texBrowser, emissive: 0x2a2a2a, emissiveMap: texBrowser })),
    trackMat(lambert({ map: texScratch, emissive: 0x2a2a2a, emissiveMap: texScratch })),
    trackMat(lambert({ map: texDesktop, emissive: 0x2a2a2a, emissiveMap: texDesktop }))
  ];

  // 절전 머티리얼 (어두운 화면 + 미세한 오렌지 emissive)
  const sleepScreenMat = trackMat(lambert({ map: texSleep, emissive: 0x110800 }));

  // 꺼짐 머티리얼 (완전 검은색, emissive 없음)
  const offScreenMat = trackMat(lambert({ color: 0x060608 }));

  const floorMat = trackMat(lambert({ map: floorTex }));
  const deskWoodMat = trackMat(lambert({ color: 0x6e4727 }));      // 책상 갈색 목재
  const monitorBezelMat = trackMat(lambert({ color: 0x1f1f1f }));  // 모니터 베젤 블랙
  const towerMat = trackMat(lambert({ color: 0x2e2e2e }));         // 타워 본체 스틸
  const keyboardMat = trackMat(lambert({ color: 0x111111 }));      // 키보드 키캡
  const mousepadMat = trackMat(lambert({ color: 0x1d3557 }));      // 마우스패드 블루
  const mouseBodyMat = trackMat(lambert({ color: 0x18181b }));     // 학생 마우스 매트 블랙 (P2)
  const mouseWheelMat = trackMat(lambert({ color: 0x3f3f46 }));    // 마우스 휠 차콜 (P2)
  const chairCushionMat = trackMat(lambert({ color: 0x264653 }));  // 의자 좌판
  const chairFrameMat = trackMat(lambert({ color: 0x141414 }));    // 의자 스틸 프레임
  const cableMat = trackMat(lambert({ color: 0x0a0a0a }));         // 케이블 뭉치
  const screenMat = trackMat(lambert({ color: 0xf4f1de }));        // 프로젝터 스크린
  const teacherDeskMat = trackMat(lambert({ color: 0x5a3618 }));   // 교탁 짙은 원목

  // 후방 가구 전용 머티리얼 (P1)
  const bookcaseWoodMat = trackMat(lambert({ color: 0x5c3a21 }));   // 책장 원목
  const bookBlueMat = trackMat(lambert({ color: 0x2b4c7e }));       // 컴퓨터 교재 파랑
  const bookRedMat = trackMat(lambert({ color: 0x9b2226 }));        // 코딩 교과서 빨강
  const bookGreenMat = trackMat(lambert({ color: 0x2d6a4f }));      // 소프트웨어 박스 초록
  const cartFrameMat = trackMat(lambert({ color: 0xd0d0d0 }));      // 헤드셋 카트 프레임
  const cartBinMat = trackMat(lambert({ color: 0x4a5568 }));        // 보관 바구니 슬레이트 그레이
  const headsetMat = trackMat(lambert({ color: 0x1a1a24 }));        // 헤드셋 본체 블랙
  const earpadMat = trackMat(lambert({ color: 0x2d3748 }));         // 이어패드 차콜

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
  addBox(4.2, 2.4, 0.05, onScreenMats[0], 0, 4.2, -34.64, { collide: false, sample: true });
  addBox(1.4, 2.0, 3.2, towerMat, 5.0, 1.0, -34, { collide: false, sample: true });
  addBox(3.4, 0.12, 1.4, keyboardMat, 0, 2.9, -33.2, { collide: false, sample: true });
  addBox(0.7, 0.38, 1.15, mouseBodyMat, 2.4, 3.09, -33.2, { collide: false, sample: true });
  addBox(0.15, 0.12, 0.28, mouseWheelMat, 2.4, 3.29, -33.45, { collide: false, sample: false });

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

  // [P1] 미정리 키보드 4석 및 미정리 의자 4석 설정
  // 좌석 인덱스: rowIdx (0~3), colIdx (0~5: leftColX 0~2, rightColX 3~5)
  // 1) 키보드 4석 (회전 15~25도, 오프셋 0.3~0.5 유닛)
  const deformedKeyboards = new Map([
    // Row 0 Col 1: cx=-31, rz=-16. Y축 +20도, 오프셋 (dx=0.0, dz=-0.4)
    ["0,1", { rotY: 20 * Math.PI / 180, dx: 0.0, dz: -0.4 }],
    // Row 1 Col 3: cx=17, rz=-2. Y축 +22도, 오프셋 (dx=0.1, dz=-0.45)
    ["1,3", { rotY: 22 * Math.PI / 180, dx: 0.1, dz: -0.45 }],
    // Row 2 Col 2: cx=-17, rz=12. Y축 -18도, 오프셋 (dx=-0.15, dz=0.35)
    ["2,2", { rotY: -18 * Math.PI / 180, dx: -0.15, dz: 0.35 }],
    // Row 3 Col 5: cx=45, rz=26. Y축 -25도, 오프셋 (dx=0.0, dz=0.4)
    ["3,5", { rotY: -25 * Math.PI / 180, dx: 0.0, dz: 0.4 }]
  ]);

  // 2) 의자 4석 (돌출 0.8~1.4 유닛, 회전 20~45도, AABB 동기화)
  const deformedChairs = new Map([
    // Row 0 Col 2: cx=-17, rz=-16. 돌출 dz=+1.1, Y축 +30도
    ["0,2", { displaceZ: 1.1, rotY: 30 * Math.PI / 180 }],
    // Row 1 Col 4: cx=31, rz=-2. 돌출 dz=+1.3, Y축 +35도
    ["1,4", { displaceZ: 1.3, rotY: 35 * Math.PI / 180 }],
    // Row 2 Col 0: cx=-45, rz=12. 돌출 dz=+0.9, Y축 -25도
    ["2,0", { displaceZ: 0.9, rotY: -25 * Math.PI / 180 }],
    // Row 3 Col 3: cx=17, rz=26. 돌출 dz=+1.0, Y축 -40도
    ["3,3", { displaceZ: 1.0, rotY: -40 * Math.PI / 180 }]
  ]);

  // [P3] 모니터 전원 및 화면 상태 설정 (18 ON, 3 Sleep, 3 OFF)
  // 꺼짐 3석: Row0 Col0, Row2 Col5, Row3 Col1
  const offMonitorSeats = new Set(["0,0", "2,5", "3,1"]);
  // 절전 3석: Row0 Col5, Row1 Col1, Row2 Col4
  const sleepMonitorSeats = new Set(["0,5", "1,1", "2,4"]);
  // [P2] 마우스 미배치 4석 (중앙 통로 변 - 지우개 요정 위장 명당)
  // Row0 Col2, Row1 Col3, Row2 Col2, Row3 Col3
  const noMouseSeats = new Set(["0,2", "1,3", "2,2", "3,3"]);

  // 켜진 18석 화면 배정: 6종 화면을 3대씩 균등 배정
  const onScreenPatterns = [];
  for (let p = 0; p < 6; p++) {
    onScreenPatterns.push(onScreenMats[p], onScreenMats[p], onScreenMats[p]);
  }
  const onSeatScreenMap = new Map();
  let onCounter = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      const k = `${r},${c}`;
      if (!offMonitorSeats.has(k) && !sleepMonitorSeats.has(k)) {
        onSeatScreenMap.set(k, onScreenPatterns[onCounter++]);
      }
    }
  }

  let leftCount = 0;
  let rightCount = 0;

  const allCols = [...leftColX, ...rightColX];

  // 24석 생성 루프
  rowZ.forEach((rz, rIdx) => {
    allCols.forEach((cx, cIdx) => {
      const isLeft = cx < 0;
      if (isLeft) leftCount++; else rightCount++;
      const seatKey = `${rIdx},${cIdx}`;

      // A. 책상 상판 (너비 8.0, 두께 0.4, 깊이 3.6, y = 2.8)
      addBox(8.0, 0.4, 3.6, deskWoodMat, cx, 2.8, rz, { collide: false, sample: true });
      addAABBCollider(cx, 2.8, rz, 8.0, 0.4, 3.6);

      // B. 책상 좌우 다리 패널 (두께 0.3, 높이 2.6, 깊이 3.4)
      addBox(0.3, 2.6, 3.4, deskWoodMat, cx - 3.75, 1.3, rz, { collide: false, sample: true });
      addBox(0.3, 2.6, 3.4, deskWoodMat, cx + 3.75, 1.3, rz, { collide: false, sample: true });
      addAABBCollider(cx - 3.75, 1.3, rz, 0.3, 2.6, 3.4);
      addAABBCollider(cx + 3.75, 1.3, rz, 0.3, 2.6, 3.4);

      // C. 16:9 슬림 모니터 & 스탠드 (너비 4.0, 높이 2.4, 깊이 0.25)
      // 모니터 베젤 및 [P3] 화면 메쉬
      addBox(4.0, 2.4, 0.25, monitorBezelMat, cx, 4.2, rz - 0.8, { collide: false, sample: true });
      let screenMatForSeat;
      if (offMonitorSeats.has(seatKey)) {
        screenMatForSeat = offScreenMat;
      } else if (sleepMonitorSeats.has(seatKey)) {
        screenMatForSeat = sleepScreenMat;
      } else {
        screenMatForSeat = onSeatScreenMap.get(seatKey) || onScreenMats[0];
      }
      addBox(3.7, 2.1, 0.05, screenMatForSeat, cx, 4.2, rz - 0.65, { collide: false, sample: true });
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

      // F. 마우스패드 & [P2] 마우스 & 키보드
      addBox(2.0, 0.04, 1.6, mousepadMat, cx + 2.0, 3.02, rz + 0.5, { collide: false, sample: true });

      // [P2] 학생 마우스 20개 (중앙 통로 변 4석은 지우개 요정 위장 명당으로 미배치)
      if (!noMouseSeats.has(seatKey)) {
        // 마우스 본체 (너비 0.7, 깊이 1.15, 높이 0.38)
        addBox(0.7, 0.38, 1.15, mouseBodyMat, cx + 2.1, 3.23, rz + 0.5, { collide: false, sample: true });
        // 마우스 휠
        addBox(0.15, 0.12, 0.28, mouseWheelMat, cx + 2.1, 3.43, rz + 0.25, { collide: false, sample: false });
      }

      // 키보드 변형 적용 여부 확인
      const kbMod = deformedKeyboards.get(seatKey);
      if (kbMod) {
        const kbX = cx - 0.8 + kbMod.dx;
        const kbZ = rz + 0.5 + kbMod.dz;
        addBox(3.4, 0.12, 1.2, keyboardMat, kbX, 3.06, kbZ, { collide: false, sample: true, ry: kbMod.rotY });
      } else {
        addBox(3.4, 0.12, 1.2, keyboardMat, cx - 0.8, 3.06, rz + 0.5, { collide: false, sample: true });
      }

      // G. 사무용 회전 바퀴의자
      const chairMod = deformedChairs.get(seatKey);
      if (chairMod) {
        // [P1] 미정리 회전 바퀴의자: 뒤로 돌출 + Y축 회전
        const chairZ = rz + 2.3 + chairMod.displaceZ;
        const chairX = cx;
        const rotY = chairMod.rotY;
        const cosR = Math.cos(rotY);
        const sinR = Math.sin(rotY);

        // 로컬 오프셋 (lx, lz)를 rotY로 회전시키는 헬퍼
        const rotatePos = (lx, lz) => [
          chairX + lx * cosR + lz * sinR,
          chairZ - lx * sinR + lz * cosR
        ];

        // 좌판 쿠션 (너비 2.6, 깊이 2.6, 두께 0.4, y = 1.6)
        addBox(2.6, 0.4, 2.6, chairCushionMat, chairX, 1.6, chairZ, { collide: false, sample: true, ry: rotY });

        // 등받이 (너비 2.4, 높이 2.2, 두께 0.3, y = 2.8, 로컬 lz = +1.1)
        const [bkX, bkZ] = rotatePos(0, 1.1);
        addBox(2.4, 2.2, 0.3, chairCushionMat, bkX, 2.8, bkZ, { collide: false, sample: true, ry: rotY });

        // 오발 다리 및 중심 가스쇼바 기둥
        addCyl(0.2, 0.8, chairFrameMat, chairX, 0.8, chairZ, { collide: false, sample: false });
        addBox(2.6, 0.15, 0.3, chairFrameMat, chairX, 0.3, chairZ, { collide: false, sample: false, ry: rotY });
        addBox(0.3, 0.15, 2.6, chairFrameMat, chairX, 0.3, chairZ, { collide: false, sample: false, ry: rotY });

        // 의자 좌판 충돌체 (회전 형상을 감싸도록 3.0 x 1.6 x 3.0, 중심 완벽 동기화)
        addAABBCollider(chairX, 1.8, chairZ, 3.0, 1.6, 3.0);
      } else {
        // 기본 정돈된 의자 (책상 뒤편 rz + 2.3)
        const chairZ = rz + 2.3;
        addBox(2.6, 0.4, 2.6, chairCushionMat, cx, 1.6, chairZ, { collide: false, sample: true });
        addBox(2.4, 2.2, 0.3, chairCushionMat, cx, 2.8, chairZ + 1.1, { collide: false, sample: true });
        addCyl(0.2, 0.8, chairFrameMat, cx, 0.8, chairZ, { collide: false, sample: false });
        addBox(2.6, 0.15, 0.3, chairFrameMat, cx, 0.3, chairZ, { collide: false, sample: false });
        addBox(0.3, 0.15, 2.6, chairFrameMat, cx, 0.3, chairZ, { collide: false, sample: false });
        addAABBCollider(cx, 1.8, chairZ, 2.6, 1.6, 2.6);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 4-1. 후방 전산 책장 및 헤드셋 보관함 (P1)
  // ─────────────────────────────────────────────────────────────────
  // A. 후방 좌측 전산 책장 (3단 수납장)
  // 위치: x in [-42, -26], z in [38, 42], y = 0 ~ 7.5
  // 중심: (-36.0, 3.75, 40.5), 크기: (10.0, 7.5, 2.6) -> AABB min [-41, 0, 39.2], max [-31, 7.5, 41.8]
  // 후면 백패널
  addBox(10.0, 7.5, 0.2, bookcaseWoodMat, -36.0, 3.75, 41.7, { collide: false, sample: true });
  // 좌우 측판
  addBox(0.25, 7.5, 2.6, bookcaseWoodMat, -40.875, 3.75, 40.5, { collide: false, sample: true });
  addBox(0.25, 7.5, 2.6, bookcaseWoodMat, -31.125, 3.75, 40.5, { collide: false, sample: true });
  // 선반 4개 (하판, 1단, 2단, 상판)
  addBox(9.6, 0.3, 2.5, bookcaseWoodMat, -36.0, 0.15, 40.5, { collide: false, sample: true });
  addBox(9.6, 0.25, 2.4, bookcaseWoodMat, -36.0, 2.6, 40.5, { collide: false, sample: true });
  addBox(9.6, 0.25, 2.4, bookcaseWoodMat, -36.0, 5.0, 40.5, { collide: false, sample: true });
  addBox(10.0, 0.25, 2.6, bookcaseWoodMat, -36.0, 7.375, 40.5, { collide: false, sample: true });

  // 책장 수납물 (컴퓨터 교재, 코딩 교과서, 소프트웨어 박스)
  // 1단 교재들
  addBox(2.2, 1.8, 1.8, bookBlueMat, -38.5, 1.2, 40.3, { collide: false, sample: true });
  addBox(2.6, 1.6, 1.7, bookRedMat, -36.0, 1.1, 40.3, { collide: false, sample: true });
  addBox(2.0, 1.9, 1.8, bookGreenMat, -33.5, 1.25, 40.3, { collide: false, sample: true });
  // 2단 교재들
  addBox(2.4, 1.7, 1.8, bookGreenMat, -38.4, 3.55, 40.3, { collide: false, sample: true });
  addBox(2.2, 1.8, 1.7, bookBlueMat, -35.8, 3.6, 40.3, { collide: false, sample: true });
  addBox(2.5, 1.6, 1.8, bookRedMat, -33.3, 3.5, 40.3, { collide: false, sample: true });
  // 3단 교재들
  addBox(3.0, 1.5, 1.8, bookBlueMat, -38.0, 5.85, 40.3, { collide: false, sample: true });
  addBox(3.2, 1.6, 1.7, bookRedMat, -34.0, 5.9, 40.3, { collide: false, sample: true });

  // 책장 외곽 AABB 등록
  addAABBCollider(-36.0, 3.75, 40.5, 10.0, 7.5, 2.6);

  // B. 후방 우측 헤드셋 보관함 (이동식 2단 수납 카트 및 헤드셋 10개)
  // 위치: x in [26, 40], z in [38, 42], y in [0, 4.0]
  // 중심: (36.0, 2.0, 40.5), 크기: (8.0, 4.0, 2.4) -> AABB min [32, 0, 39.3], max [40, 4.0, 41.7]
  // 4개 수직 프레임 기둥 및 바퀴
  [
    [32.2, 39.5], [39.8, 39.5],
    [32.2, 41.5], [39.8, 41.5]
  ].forEach(([px, pz]) => {
    addBox(0.3, 3.8, 0.3, cartFrameMat, px, 2.0, pz, { collide: false, sample: false });
    addCyl(0.25, 0.2, cartFrameMat, px, 0.15, pz, { collide: false, sample: false, rx: Math.PI / 2 });
  });

  // 2단 바구니 수납함 (하단, 상단)
  addBox(7.2, 1.0, 2.0, cartBinMat, 36.0, 0.9, 40.5, { collide: false, sample: true });
  addBox(7.2, 1.0, 2.0, cartBinMat, 36.0, 2.6, 40.5, { collide: false, sample: true });

  // 헤드셋 정확히 10개 (상단 5개, 하단 5개)
  const headsetXs = [33.2, 34.6, 36.0, 37.4, 38.8];
  // 상단 바구니 5개
  headsetXs.forEach(hx => {
    const hy = 3.3;
    const hz = 40.5;
    // 헤드밴드 (아치형)
    addBox(0.8, 0.1, 0.25, headsetMat, hx, hy + 0.35, hz, { collide: false, sample: false });
    addBox(0.1, 0.4, 0.25, headsetMat, hx - 0.35, hy + 0.18, hz, { collide: false, sample: false });
    addBox(0.1, 0.4, 0.25, headsetMat, hx + 0.35, hy + 0.18, hz, { collide: false, sample: false });
    // 좌우 이어패드
    addBox(0.2, 0.38, 0.38, earpadMat, hx - 0.38, hy, hz, { collide: false, sample: true });
    addBox(0.2, 0.38, 0.38, earpadMat, hx + 0.38, hy, hz, { collide: false, sample: true });
  });
  // 하단 바구니 5개
  headsetXs.forEach(hx => {
    const hy = 1.6;
    const hz = 40.5;
    // 헤드밴드 (아치형)
    addBox(0.8, 0.1, 0.25, headsetMat, hx, hy + 0.35, hz, { collide: false, sample: false });
    addBox(0.1, 0.4, 0.25, headsetMat, hx - 0.35, hy + 0.18, hz, { collide: false, sample: false });
    addBox(0.1, 0.4, 0.25, headsetMat, hx + 0.35, hy + 0.18, hz, { collide: false, sample: false });
    // 좌우 이어패드
    addBox(0.2, 0.38, 0.38, earpadMat, hx - 0.38, hy, hz, { collide: false, sample: true });
    addBox(0.2, 0.38, 0.38, earpadMat, hx + 0.38, hy, hz, { collide: false, sample: true });
  });

  // [P1 보완 1] 수납함 내 예비 주변기기 및 소형 수업/정비 도구
  const spareMouseMat = trackMat(lambert({ color: 0x18181b }));
  const toolBlueMat = trackMat(lambert({ color: 0x2563eb }));
  const toolSilverMat = trackMat(lambert({ color: 0x94a3b8 }));
  const toolGreenMat = trackMat(lambert({ color: 0x10b981 }));
  const toolOrangeMat = trackMat(lambert({ color: 0xd97706 }));

  // 예비 키보드 2개 (상·하단 수납함 전면)
  addBox(3.2, 0.14, 1.15, keyboardMat, 35.0, 1.1, 39.85, { collide: false, sample: true });
  addBox(3.2, 0.14, 1.15, keyboardMat, 35.0, 2.8, 39.85, { collide: false, sample: true });

  // 예비 마우스 정확히 4개 (너비 0.7, 깊이 1.1, 높이 0.4, 지우개 요정 유사 규격)
  addBox(0.7, 0.38, 1.1, spareMouseMat, 38.6, 1.15, 39.85, { collide: false, sample: true });
  addBox(0.7, 0.38, 1.1, spareMouseMat, 38.6, 1.15, 41.15, { collide: false, sample: true });
  addBox(0.7, 0.38, 1.1, spareMouseMat, 38.6, 2.85, 39.85, { collide: false, sample: true });
  addBox(0.7, 0.38, 1.1, spareMouseMat, 38.6, 2.85, 41.15, { collide: false, sample: true });

  // 소형 수업/정비 도구 4종 (LAN 케이블 코일, USB 허브, 케이블 타이, 정밀 공구 케이스)
  addCyl(0.35, 0.22, toolBlueMat, 32.8, 1.15, 41.1, { collide: false, sample: true });
  addBox(0.9, 0.15, 0.45, toolSilverMat, 32.8, 2.85, 41.1, { collide: false, sample: true });
  addBox(0.6, 0.12, 0.35, toolGreenMat, 32.8, 1.15, 39.9, { collide: false, sample: true });
  addBox(1.0, 0.18, 0.65, toolOrangeMat, 32.8, 2.85, 39.9, { collide: false, sample: true });

  // 헤드셋 보관함 외곽 AABB 등록 (min [32, 0, 39.3], max [40, 4.0, 41.7])
  addAABBCollider(36.0, 2.0, 40.5, 8.0, 4.0, 2.4);

  // [P1 보완 2] 후방 벽면 컴퓨터 자격 인증 취득 및 시험일 안내 게시판
  // 위치: 후방 벽면 (X: -36.0, Y: 12.0, Z: 44.8) - 전산 책장 위 벽면 안착, 통로 방해 0건
  const certBoardTex = trackTex(canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = "#1e3a2f";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#8b5a2b";
    g.lineWidth = 14;
    g.strokeRect(7, 7, w - 14, h - 14);

    g.fillStyle = "#fef08a";
    g.font = "bold 24px sans-serif";
    g.textAlign = "center";
    g.fillText("🏆 컴퓨터 자격 인증 취득 축하", w / 2, 48);

    g.fillStyle = "#ffffff";
    g.font = "bold 20px sans-serif";
    g.fillText("컴퓨터 자격 인증 취득 축하 — 학생 8명", w / 2, 95);

    g.font = "16px sans-serif";
    g.fillStyle = "#cbd5e1";
    g.fillText("(ITQ / DIAT 공인 인증 평가 합격)", w / 2, 125);

    g.strokeStyle = "rgba(255,255,255,0.3)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(40, 145);
    g.lineTo(w - 40, 145);
    g.stroke();

    g.fillStyle = "#fde047";
    g.font = "bold 20px sans-serif";
    g.fillText("다음 모의 자격증 시험일: 2026년 10월 24일(토)", w / 2, 185);

    g.font = "15px sans-serif";
    g.fillStyle = "#94a3b8";
    g.fillText("장소: 본교 컴퓨터실 | 준비물: 수험표, 필기도구", w / 2, 220);
  }));

  const certBoardMat = trackMat(lambert({ map: certBoardTex }));
  // 게시판 보드 본체 (장식용 비충돌, 스포이드 가능)
  addBox(10.0, 5.0, 0.1, certBoardMat, -36.0, 12.0, 44.8, { collide: false, sample: true });
  // 우드 프레임 테두리
  addBox(10.4, 5.4, 0.08, bookcaseWoodMat, -36.0, 12.0, 44.86, { collide: false, sample: false });

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

  // 3. 전용 텍스처 중복 없는 안전 해제
  const disposedTexs = new Set();
  compGimmickState.disposableTextures.forEach(t => {
    if (t && typeof t.dispose === "function" && !disposedTexs.has(t)) {
      disposedTexs.add(t);
      t.dispose();
    }
  });
  compGimmickState.disposableTextures = [];

  compGimmickState.animTime = 0;
}
