/**
 * 🎨 maps/art_room.js - 미술실 (Art Room)
 * 
 * 《교실 대소동: 사라진 지우개 찾기》 독립 맵 모듈
 * - 의존성 주입(ctx) 패턴 준수
 * - setWallHeight 계약 준수
 * - Zero-Asset 원칙: Three.js 절차적 지오메트리 & 2D Canvas 텍스처
 * - 표준 생명주기: ART_ROOM_MAP, buildArtRoom, updateArtRoomGimmicks, cleanupArtRoom
 */

export const ART_ROOM_MAP = {
  id: "art_room",
  name: "미술실",
  icon: "🎨"
};

// 기믹 상태 관리 (모듈 내부 격리)
let artRoomGimmickState = {
  paintPuddles: [],
  animTime: 0
};

/**
 * 미술실 3D 공간 생성
 * @param {Object} ctx - 엔진 주입 컨텍스트
 */
export function buildArtRoom(ctx) {
  const {
    THREE, mapRoot, ROOM_W, ROOM_D,
    addBox, addCyl, canvasTex, lambert,
    addAABBCollider, samplables, colliders,
    refillZones, hiderSpawns, seekerSpawns,
    buildRoomShell, setWallHeight
  } = ctx;

  // 벽 높이 계약 적용 (컨텍스트 함수 호출)
  const WALL_H = 34;
  if (typeof setWallHeight === "function") {
    setWallHeight(WALL_H);
  }

  // 1. 미술실 전용 바닥 텍스처 (리놀륨 타일 + 물감 방울 얼룩)
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    // 기본 미색 타일 그리드
    g.fillStyle = "#e8e5dc";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(160, 155, 140, 0.4)";
    g.lineWidth = 3;
    for (let i = 0; i <= 8; i++) {
      g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke();
    }
    // 바닥에 튄 알록달록한 수채화 물감 얼룩 디테일
    const drops = [
      { x: 80, y: 120, r: 18, c: "rgba(230, 69, 69, 0.45)" },
      { x: 190, y: 320, r: 24, c: "rgba(74, 127, 181, 0.4)" },
      { x: 380, y: 160, r: 16, c: "rgba(245, 197, 24, 0.45)" },
      { x: 310, y: 410, r: 20, c: "rgba(63, 157, 90, 0.4)" },
      { x: 440, y: 360, r: 14, c: "rgba(138, 90, 185, 0.35)" }
    ];
    drops.forEach(d => {
      g.fillStyle = d.c;
      g.beginPath(); g.arc(d.x, d.y, d.r, 0, Math.PI * 2); g.fill();
      // 주변 미세 튐
      for (let k = 0; k < 4; k++) {
        const ox = (Math.random() - 0.5) * d.r * 2.2;
        const oy = (Math.random() - 0.5) * d.r * 2.2;
        g.beginPath(); g.arc(d.x + ox, d.y + oy, d.r * 0.25, 0, Math.PI * 2); g.fill();
      }
    });
  }, 6, 5);

  // 룸 쉘 생성 (바닥, 벽, 천장, 걸레받이)
  buildRoomShell(lambert({ map: floorTex }), 0xf0ede4, 0xfaf8f5, 0x8c7e6c);

  // ─────────────────────────────────────────────────────────────────
  // 2. 전면 (-Z): 칠판 + 미술 대회 포스터 + 시범대 (리필존: 대형 팔레트)
  // ─────────────────────────────────────────────────────────────────
  const czFront = -ROOM_D / 2 + 1.2;

  // 초록 칠판
  addBox(46, 17, 0.8, lambert({ color: 0x244f3e }), -8, 12, czFront);
  addBox(47.4, 18.4, 0.4, lambert({ color: 0x7c5a38 }), -8, 12, czFront - 0.2, { collide: false }); // 나무 프레임

  // 미술 대회 포스터 (비행기, 해바라기 등 알록달록한 그림 텍스처)
  const posterTex = canvasTex(256, 180, (g, w, h) => {
    g.fillStyle = "#fffbf0"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#4A7FB5"; g.fillRect(16, 16, w - 32, 40); // 하늘
    g.fillStyle = "#F5C518"; g.beginPath(); g.arc(50, 36, 14, 0, Math.PI * 2); g.fill(); // 해
    g.fillStyle = "#3f9d5a"; g.fillRect(16, 56, w - 32, 45); // 언덕
    g.fillStyle = "#E64545"; g.font = "bold 20px sans-serif"; g.textAlign = "center";
    g.fillText("전국 어린이 미술대회", w / 2, 135);
    g.fillStyle = "#8a5ab9"; g.font = "bold 14px sans-serif";
    g.fillText("🎨 상상력을 마음껏 펼쳐요!", w / 2, 160);
  });
  const posterMesh = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), lambert({ map: posterTex }));
  posterMesh.position.set(28, 19, czFront + 0.1);
  mapRoot.add(posterMesh);
  samplables.push(posterMesh);

  // 교사용 시범 테이블 (Y=3.2 상판)
  addBox(24, 3.2, 7, lambert({ color: 0x8a623e }), -8, 1.6, czFront + 8);
  addBox(24.8, 0.6, 7.8, lambert({ color: 0xd9c5a7 }), -8, 3.5, czFront + 8); // 두꺼운 상판
  addAABBCollider(-8, 1.8, czFront + 8, 25, 3.8, 8); // 시범대 통짜 충돌체

  // 시범대 위 물감 리필존 (대형 원형 팔레트)
  addCyl(3.2, 0.25, lambert({ color: 0xfdfaf2 }), -8, 3.9, czFront + 8, { rt: 3.2, collide: false, sample: true });
  const refillPaletteColors = [0xE64545, 0xF5C518, 0x3f9d5a, 0x4A7FB5, 0x8a5ab9, 0xe07f3e, 0xff7eb0, 0x2ec4b6];
  refillPaletteColors.forEach((col, idx) => {
    const angle = (idx / refillPaletteColors.length) * Math.PI * 2;
    const px = -8 + Math.cos(angle) * 2.1;
    const pz = (czFront + 8) + Math.sin(angle) * 2.1;
    addCyl(0.5, 0.25, lambert({ color: col }), px, 4.1, pz, { rt: 0.5, collide: false, sample: true });
  });
  refillZones.push({ x: -8, z: czFront + 8, r: 6.5, yMin: 0, yMax: 7, label: "물감 팔레트" });

  // ─────────────────────────────────────────────────────────────────
  // 3. 중앙 실습 구역: 대형 원목 미술 테이블 4개 + 16개 스툴
  // ─────────────────────────────────────────────────────────────────
  const tableConfigs = [
    { x: -28, z: -14, label: "1분임" },
    { x: 18,  z: -14, label: "2분임" },
    { x: -28, z: 20,  label: "3분임" },
    { x: 18,  z: 20,  label: "4분임" }
  ];

  // 4발 나무 스툴 헬퍼
  const buildStool = (sx, sz) => {
    addCyl(1.3, 0.35, lambert({ color: 0x9c744f }), sx, 1.8, sz, { rt: 1.3, collide: false, sample: true }); // 원형 방석
    addCyl(0.16, 1.7, lambert({ color: 0x4a3b2c }), sx - 0.7, 0.85, sz - 0.7, { collide: false }); // 4개 다리
    addCyl(0.16, 1.7, lambert({ color: 0x4a3b2c }), sx + 0.7, 0.85, sz - 0.7, { collide: false });
    addCyl(0.16, 1.7, lambert({ color: 0x4a3b2c }), sx - 0.7, 0.85, sz + 0.7, { collide: false });
    addCyl(0.16, 1.7, lambert({ color: 0x4a3b2c }), sx + 0.7, 0.85, sz + 0.7, { collide: false });
    addAABBCollider(sx, 1.0, sz, 2.0, 2.0, 2.0); // 스툴 충돌
  };

  // 소품 헬퍼: 수채화 팔레트 (지우개 위장용 선명한 원색 덩어리)
  const buildPalette = (tx, tz, angle) => {
    addBox(4.2, 0.2, 2.8, lambert({ color: 0xf8f8f4 }), tx, 4.3, tz, { ry: angle, collide: false, sample: true });
    const palColors = [0xE64545, 0xF5C518, 0x3f9d5a, 0x4A7FB5, 0x8a5ab9, 0x222222];
    for (let k = 0; k < 6; k++) {
      const ox = (k % 3 - 1) * 1.1;
      const oz = (Math.floor(k / 3) - 0.5) * 0.9;
      addBox(0.65, 0.28, 0.65, lambert({ color: palColors[k] }), tx + ox, 4.45, tz + oz, { collide: false, sample: true });
    }
  };

  // 소품 헬퍼: 3칸 투명 물통
  const buildWaterBucket = (bx, bz) => {
    addBox(2.8, 1.6, 1.4, lambert({ color: 0xc8e6f5, transparent: true, opacity: 0.5 }), bx, 4.9, bz, { collide: false, sample: false });
    // 3칸 수채 물 색상 (맑은물, 주황물, 초록물)
    const waterCols = [0x5aaee6, 0xdf8538, 0x4e9b62];
    for (let w = 0; w < 3; w++) {
      addBox(0.7, 1.1, 1.1, lambert({ color: waterCols[w] }), bx - 0.8 + w * 0.8, 4.75, bz, { collide: false, sample: true });
    }
  };

  // 소품 헬퍼: 48색 크레파스 상자
  const buildCrayonBox = (cx, cz, angle) => {
    addBox(3.8, 0.4, 2.6, lambert({ color: 0xf5c518 }), cx, 4.3, cz, { ry: angle, collide: false, sample: true }); // 노란 상자
    const crayonCols = [0xe74c3c, 0xe67e22, 0xf1c40f, 0x2ecc71, 0x1abc9c, 0x3498db, 0x9b59b6, 0x34495e];
    for (let c = 0; c < 8; c++) {
      const co = (c - 3.5) * 0.4;
      addCyl(0.14, 1.8, lambert({ color: crayonCols[c] }), cx + co, 4.5, cz, { rx: Math.PI / 2, ry: angle, collide: false, sample: true });
    }
  };

  // 소품 헬퍼: 붓꽂이 원통
  const buildBrushJar = (jx, jz) => {
    addCyl(0.7, 1.8, lambert({ color: 0xd6dbdf }), jx, 5.0, jz, { rt: 0.7, collide: false, sample: true });
    addCyl(0.08, 3.0, lambert({ color: 0x3e2723 }), jx - 0.2, 5.8, jz, { rz: 0.2, collide: false }); // 붓대
    addCyl(0.08, 2.8, lambert({ color: 0x4e342e }), jx + 0.2, 5.7, jz + 0.1, { rz: -0.25, collide: false });
    addCyl(0.08, 3.2, lambert({ color: 0x2b1d0c }), jx, 6.0, jz - 0.2, { rx: 0.2, collide: false });
  };

  tableConfigs.forEach((tc) => {
    // 미술 테이블 몸체 & 두꺼운 원목 상판
    addBox(26, 3.4, 12, lambert({ color: 0x6e4a2e }), tc.x, 1.7, tc.z);
    addBox(27.4, 0.8, 13.2, lambert({ color: 0xc49a6c }), tc.x, 3.8, tc.z);
    addAABBCollider(tc.x, 2.1, tc.z, 27.6, 4.2, 13.4); // 테이블 통짜 충돌체

    // 4방향 스툴
    buildStool(tc.x - 9, tc.z - 8.5);
    buildStool(tc.x + 9, tc.z - 8.5);
    buildStool(tc.x - 9, tc.z + 8.5);
    buildStool(tc.x + 9, tc.z + 8.5);

    // 테이블 위 다양한 미술 소품 배치
    buildPalette(tc.x - 6, tc.z - 2, 0.15);
    buildWaterBucket(tc.x, tc.z);
    buildCrayonBox(tc.x + 6, tc.z + 1, -0.2);
    buildBrushJar(tc.x + 9, tc.z - 3);

    // 테이블 위 하얀 스케치북 도화지 (지우개 기본색 위장 명소!)
    addBox(6, 0.1, 4.5, lambert({ color: 0xffffff }), tc.x - 5, 4.25, tc.z + 2.5, { collide: false, sample: true });
  });

  // ─────────────────────────────────────────────────────────────────
  // 4. 좌측 (-X): 12단 미술 작품 건조대 (수직 파쿠르 계단식 구조)
  // 통짜 AABB를 배제하고 기둥 및 선반별 개별 충돌체를 적용하여
  // 플레이어가 선반을 밟고 점프로 올라갈 수 있도록 설계
  // ─────────────────────────────────────────────────────────────────
  const rackX = -ROOM_W / 2 + 5.5; // -54.5
  const rackZ = 4;
  
  // 건조대 스틸 프레임: 전후 양쪽 기둥 (개별 충돌체)
  addBox(4.5, 23.5, 1.2, lambert({ color: 0x566573 }), rackX, 11.75, rackZ - 11, { collide: true, sample: false });
  addBox(4.5, 23.5, 1.2, lambert({ color: 0x566573 }), rackX, 11.75, rackZ + 11, { collide: true, sample: false });
  // 상단 연결 바
  addBox(4.5, 1.2, 22, lambert({ color: 0x566573 }), rackX, 23.6, rackZ, { collide: true, sample: false });

  // 정확히 12단 와이어 선반 생성 (파쿠르 가능, 단별 collide: true)
  const drawColors = [
    0xff7675, 0x74b9ff, 0x55efc4, 0xffeaa7,
    0xa29bfe, 0xfab1a0, 0x81ecec, 0xff9ff3,
    0xffbe76, 0xbadc58, 0x686de0, 0xe056fd
  ];
  for (let s = 0; s < 12; s++) {
    const sy = 1.8 + s * 1.8; // 1.8m부터 1.8m 간격으로 12단 (최대 Y = 21.6)
    // 와이어 슬롯 선반 (플레이어가 밟고 설 수 있는 충돌면)
    addBox(4.2, 0.18, 20.8, lambert({ color: 0x85929e }), rackX, sy, rackZ, { collide: true, sample: false });
    // 선반 위에 놓인 건조 도화지 (스포이드 색 추출 가능)
    const picCol = drawColors[s % drawColors.length];
    addBox(3.4, 0.25, 7.5, lambert({ color: picCol }), rackX, sy + 0.18, rackZ - 4.5 + (s % 2) * 9.0, { collide: false, sample: true });
  }

  // ─────────────────────────────────────────────────────────────────
  // 5. 우측 (+X): 이젤 4대 + 찰흙 작업대
  // ─────────────────────────────────────────────────────────────────
  const easelBaseX = ROOM_W / 2 - 7;
  const easelZs = [-26, -10, 8, 24];

  easelZs.forEach((ez, i) => {
    // 3발 나무 이젤 프레임
    addCyl(0.18, 12, lambert({ color: 0x8d6e63 }), easelBaseX, 6, ez - 1.2, { rz: 0.12, collide: false });
    addCyl(0.18, 12, lambert({ color: 0x8d6e63 }), easelBaseX, 6, ez + 1.2, { rz: -0.12, collide: false });
    addCyl(0.18, 11, lambert({ color: 0x6d4c41 }), easelBaseX + 1.6, 5.5, ez, { rx: 0.22, collide: false });
    // 가로 받침대
    addBox(1.2, 0.4, 5.6, lambert({ color: 0x5d4037 }), easelBaseX, 4.8, ez, { collide: true });
    // 캔버스 화폭 (각기 다른 그림 색채취 지원)
    const canvasColor = [0xffffff, 0xfff9c4, 0xe1f5fe, 0xfce4ec][i % 4];
    addBox(0.4, 6.2, 4.6, lambert({ color: canvasColor }), easelBaseX, 7.8, ez, { collide: true, sample: true });
    addAABBCollider(easelBaseX, 5.5, ez, 3.2, 11, 5.8);
  });

  // 조소용 찰흙 테이블 (우측 후면)
  const clayTableX = ROOM_W / 2 - 8;
  const clayTableZ = 35;
  addBox(9, 3.2, 14, lambert({ color: 0x5c4033 }), clayTableX, 1.6, clayTableZ);
  addBox(9.6, 0.6, 14.6, lambert({ color: 0xbcaaa4 }), clayTableX, 3.5, clayTableZ);
  addAABBCollider(clayTableX, 1.8, clayTableZ, 10, 3.8, 15);
  // 대형 갈색 찰흙 덩어리들 (도망자 갈색 위장 최적지)
  addBox(2.8, 1.6, 2.2, lambert({ color: 0x6d4c41 }), clayTableX - 1.5, 4.5, clayTableZ - 3, { collide: false, sample: true });
  addCyl(1.2, 1.8, lambert({ color: 0x5d4037 }), clayTableX + 1.2, 4.6, clayTableZ + 2, { rt: 0.9, collide: false, sample: true });

  // ─────────────────────────────────────────────────────────────────
  // 6. 후면 (+Z): 세면대(싱크대) + 재료 수납장
  // ─────────────────────────────────────────────────────────────────
  const czBack = ROOM_D / 2 - 2;

  // 세면대 (붓 씻는 곳)
  addBox(28, 3.2, 4.5, lambert({ color: 0x90a4ae }), 0, 1.6, czBack);
  addBox(28.4, 0.5, 4.8, lambert({ color: 0xcfd8dc }), 0, 3.4, czBack); // 스테인리스 상판
  addAABBCollider(0, 1.8, czBack, 29, 3.8, 5.2);
  // 수전(수도꼭지 3개)
  for (let fx = -8; fx <= 8; fx += 8) {
    addCyl(0.12, 1.4, lambert({ color: 0x37474f }), fx, 4.2, czBack - 0.8, { collide: false });
    addCyl(0.1, 0.8, lambert({ color: 0x37474f }), fx, 4.8, czBack - 0.4, { rx: Math.PI / 2, collide: false });
  }

  // 재료 수납장 2채 (양쪽 후면 구석)
  const buildCabinet = (cabX) => {
    addBox(18, 16, 4, lambert({ color: 0x8d6e63 }), cabX, 8, czBack);
    addAABBCollider(cabX, 8, czBack, 18.5, 16.2, 4.4);
    // 수납장 선반 속 알록달록 색종이 뭉치
    const paperCols = [0xe74c3c, 0xf39c12, 0x27ae60, 0x2980b9, 0x8e44ad];
    for (let p = 0; p < 5; p++) {
      addBox(3.4, 0.8, 2.8, lambert({ color: paperCols[p] }), cabX - 5 + (p % 3) * 4.5, 3.5 + Math.floor(p / 3) * 4, czBack - 0.5, { collide: false, sample: true });
    }
  };
  buildCabinet(-38);
  buildCabinet(38);

  // ─────────────────────────────────────────────────────────────────
  // 7. 특화 기믹: 바닥 물감 웅덩이 (Paint Puddles)
  // ─────────────────────────────────────────────────────────────────
  artRoomGimmickState.paintPuddles = [];
  const puddleDefs = [
    { x: -8, z: 4, r: 3.8, color: 0xe74c3c, label: "빨강 웅덩이" },
    { x: -2, z: -4, r: 4.2, color: 0x3498db, label: "파랑 웅덩이" },
    { x: 30, z: 5, r: 3.5, color: 0xf1c40f, label: "노랑 웅덩이" }
  ];

  puddleDefs.forEach(pd => {
    const puddleGeom = new THREE.CylinderGeometry(pd.r, pd.r, 0.08, 24);
    const puddleMat = lambert({ color: pd.color, transparent: true, opacity: 0.75 });
    const pMesh = new THREE.Mesh(puddleGeom, puddleMat);
    pMesh.position.set(pd.x, 0.04, pd.z);
    mapRoot.add(pMesh);
    samplables.push(pMesh);

    artRoomGimmickState.paintPuddles.push({
      mesh: pMesh,
      x: pd.x,
      z: pd.z,
      r: pd.r,
      color: pd.color
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 8. 스폰 지점 (Spawns): 충돌체 바깥 안전 바닥 배치
  // ─────────────────────────────────────────────────────────────────
  // 지우개 요정 스폰: 정확히 20개 충돌체 외곽 바닥 확정 배치
  hiderSpawns.length = 0;
  const hiderCoords = [
    [-28, -2],   // 1분임 테이블 밑 통로
    [-28, -26],  // 1분임 앞 통로
    [-44, -14],  // 1분임 좌측 통로
    [18, -2],    // 2분임 테이블 밑 통로
    [18, -26],   // 2분임 앞 통로
    [34, -14],   // 2분임 우측 통로
    [-28, 32],   // 3분임 후면 통로
    [-44, 20],   // 3분임 건조대 사이
    [18, 32],    // 4분임 후면 통로
    [34, 20],    // 4분임 이젤 사이
    [-48, -28],  // 건조대 앞 구석
    [-48, 18],   // 건조대 옆 통로
    [46, -34],   // 1번 이젤 뒤
    [46, -18],   // 2번 이젤 뒤
    [46, 0],     // 3번 이젤 뒤
    [46, 16],    // 4번 이젤 뒤
    [46, 30],    // 찰흙 테이블 옆
    [-18, 38],   // 세면대 좌측 통로
    [18, 38],    // 세면대 우측 통로
    [-38, 38]    // 좌측 재료 수납장 앞
  ];
  hiderCoords.forEach(c => hiderSpawns.push(new THREE.Vector3(c[0], 0, c[1])));

  // 연필 술래 스폰: 6개 (교탁 앞 중앙 구역)
  seekerSpawns.length = 0;
  const seekerCoords = [
    [-16, -26],
    [-8, -26],
    [0, -26],
    [8, -26],
    [-4, -32],
    [4, -32]
  ];
  seekerCoords.forEach(c => seekerSpawns.push(new THREE.Vector3(c[0], 0, c[1])));
}

/**
 * 미술실 매 프레임 기믹 갱신
 * @param {Object} ctx - 엔진 컨텍스트
 * @param {number} dt - 프레임 경과 시간 (초)
 */
export function updateArtRoomGimmicks(ctx, dt) {
  if (!dt) return;
  artRoomGimmickState.animTime += dt;

  // 물감 웅덩이 은은한 호흡 펄스 이펙트 (반투명도 0.7 ~ 0.83 진동)
  const pulse = Math.sin(artRoomGimmickState.animTime * 2.5) * 0.06;
  artRoomGimmickState.paintPuddles.forEach(p => {
    if (p.mesh && p.mesh.material) {
      p.mesh.material.opacity = 0.75 + pulse;
    }
  });

  // ※ 발자국 기믹: 플레이어 위치 컨텍스트 계약 전까지 보류
}

/**
 * 미술실 리소스 및 기믹 정리 (맵 전환 시 필수 호출)
 * @param {Object} ctx - 엔진 컨텍스트
 */
export function cleanupArtRoom(ctx) {
  // 동적 메쉬 해제
  if (artRoomGimmickState.paintPuddles.length > 0 && ctx && ctx.mapRoot) {
    artRoomGimmickState.paintPuddles.forEach(p => {
      if (p.mesh) {
        ctx.mapRoot.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
      }
    });
  }

  // 잔여 상태 초기화
  artRoomGimmickState.paintPuddles = [];
  artRoomGimmickState.animTime = 0;
}
