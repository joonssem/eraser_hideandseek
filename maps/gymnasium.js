/**
 * 🏃 maps/gymnasium.js - 체육관 (Gymnasium)
 * 
 * 《교실 대소동: 사라진 지우개 찾기》 독립 맵 모듈
 * - 의존성 주입(ctx) 패턴 준수
 * - setWallHeight(48) 계약 준수 (탁 트인 고공 뷰)
 * - Zero-Asset 원칙: Three.js 절차적 지오메트리 & 2D Canvas 텍스처
 * - 표준 생명주기: GYMNASIUM_MAP, buildGymnasium, updateGymnasiumGimmicks, cleanupGymnasium
 */

export const GYMNASIUM_MAP = {
  id: "gymnasium",
  name: "체육관",
  icon: "🏃"
};

// 기믹 상태 관리 (모듈 내부 격리)
let gymGimmickState = {
  springboards: [],
  animTime: 0
};

/**
 * 체육관 3D 공간 생성
 * @param {Object} ctx - 엔진 주입 컨텍스트
 */
export function buildGymnasium(ctx) {
  const {
    THREE, mapRoot, ROOM_W, ROOM_D,
    addBox, addCyl, canvasTex, lambert,
    addAABBCollider, samplables, colliders,
    refillZones, hiderSpawns, seekerSpawns,
    buildRoomShell, setWallHeight
  } = ctx;

  // 1. 벽 높이 설정: 체육관 특유의 높은 층고 (48 유닛)
  const WALL_H = 48;
  if (typeof setWallHeight === "function") {
    setWallHeight(WALL_H);
  }

  // 2. 바닥 텍스처 (윤기 있는 원목 마룻바닥 + 농구 코트 라인)
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    // 마룻바닥 나무 패널 패턴
    g.fillStyle = "#d8a568";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(168, 120, 68, 0.45)";
    g.lineWidth = 2;
    for (let y = 0; y <= h; y += 32) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }
    // 코트 흰색 라인 디테일
    g.strokeStyle = "#ffffff";
    g.lineWidth = 5;
    g.strokeRect(20, 20, w - 40, h - 40); // 외곽 라인
    g.beginPath(); // 센터 라인
    g.moveTo(w / 2, 20); g.lineTo(w / 2, h - 20); g.stroke();
    g.beginPath(); // 센터 서클
    g.arc(w / 2, h / 2, 54, 0, Math.PI * 2); g.stroke();
  }, 4, 3);

  // 룸 쉘 생성 (바닥, 벽, 천장, 걸레받이)
  buildRoomShell(lambert({ map: floorTex }), 0xdfd8ca, 0xf4f0e6, 0x7c6954);

  // ─────────────────────────────────────────────────────────────────
  // 3. 전면 (-Z): 강당 무대 단상 + 레드 벨벳 커튼 + 비품함 리필존
  // ─────────────────────────────────────────────────────────────────
  const czFront = -ROOM_D / 2 + 1.2;

  // 무대 단상 메인 몸체 (너비 56, 높이 3.6, 깊이 16)
  addBox(56, 3.6, 16, lambert({ color: 0x8a5a36 }), 0, 1.8, czFront + 8);
  addBox(57.2, 0.6, 16.8, lambert({ color: 0xba8554 }), 0, 3.8, czFront + 8); // 단상 상판
  addAABBCollider(0, 2.0, czFront + 8, 57.5, 4.2, 17.0); // 단상 통짜 충돌체

  // 단상 오르내리는 좌우 계단
  const buildStageStairs = (stX) => {
    addBox(6, 1.2, 5, lambert({ color: 0xba8554 }), stX, 0.6, czFront + 17.5);
    addBox(6, 2.4, 4, lambert({ color: 0xba8554 }), stX, 1.2, czFront + 15.0);
    addAABBCollider(stX, 1.2, czFront + 16.2, 6.2, 2.5, 6.5);
  };
  buildStageStairs(-24);
  buildStageStairs(24);

  // 무대 암막 레드 커튼 (좌/우 주름 표현)
  const curtainMat = lambert({ color: 0x9e1b26 });
  addBox(14, 28, 1.5, curtainMat, -22, 18, czFront + 0.8, { collide: true, sample: true });
  addBox(14, 28, 1.5, curtainMat, 22, 18, czFront + 0.8, { collide: true, sample: true });
  addBox(58, 4.5, 1.8, curtainMat, 0, 32, czFront + 0.8, { collide: false, sample: true }); // 상단 커튼 주름

  // 무대 연단(교탁)
  addBox(4.2, 4.2, 3.2, lambert({ color: 0x4a2e1b }), 0, 5.8, czFront + 4);
  addAABBCollider(0, 5.8, czFront + 4, 4.4, 4.4, 3.4);

  // 단상 위 체육 비품함 (리필존)
  addBox(6.5, 5.5, 4.2, lambert({ color: 0x476278 }), 22, 6.4, czFront + 6);
  addAABBCollider(22, 6.4, czFront + 6, 6.8, 5.8, 4.5);
  refillZones.push({ x: 22, z: czFront + 6, r: 6.5, yMin: 3.5, yMax: 10, label: "체육 비품함" });

  // ─────────────────────────────────────────────────────────────────
  // 4. 농구 골대 2조 (남/북 양단 또는 동/서 양단)
  // ─────────────────────────────────────────────────────────────────
  const buildBasketballHoop = (hx, hz, rotY) => {
    addBox(1.4, 24, 1.4, lambert({ color: 0x2c3e50 }), hx, 12, hz, { ry: rotY });
    const armZ = rotY === 0 ? hz + 3.2 : hz - 3.2;
    addBox(1.2, 1.2, 6.5, lambert({ color: 0x2c3e50 }), hx, 21.5, (hz + armZ) / 2, { ry: rotY });
    const boardZ = rotY === 0 ? hz + 6.4 : hz - 6.4;
    addBox(12, 8.5, 0.4, lambert({ color: 0xf5f7fa, transparent: true, opacity: 0.85 }), hx, 21.5, boardZ, { ry: rotY, collide: true, sample: true });
    addBox(4.5, 3.5, 0.45, lambert({ color: 0xe74c3c }), hx, 20.2, boardZ, { ry: rotY, collide: false, sample: true });
    const rimZ = rotY === 0 ? boardZ + 2.2 : boardZ - 2.2;
    addCyl(2.0, 0.25, lambert({ color: 0xe67e22 }), hx, 18.5, rimZ, { rt: 2.0, collide: true, sample: true });
    addAABBCollider(hx, 10, hz, 2.5, 20, 2.5);
  };
  buildBasketballHoop(-46, 0, Math.PI / 2); // 서쪽 골대
  buildBasketballHoop(46, 0, -Math.PI / 2); // 동쪽 골대

  // ─────────────────────────────────────────────────────────────────
  // 5. 벽면 늑목 (스웨덴 사다리 2조 - 좌측 벽면 수직 파쿠르)
  // ─────────────────────────────────────────────────────────────────
  const buildWallLadder = (lz) => {
    const lx = -ROOM_W / 2 + 1.2;
    addBox(1.0, 26, 1.0, lambert({ color: 0xb58450 }), lx, 13, lz - 4.2);
    addBox(1.0, 26, 1.0, lambert({ color: 0xb58450 }), lx, 13, lz + 4.2);
    addAABBCollider(lx, 13, lz, 1.5, 26, 9.0);

    for (let r = 0; r < 12; r++) {
      const ry = 2.0 + r * 2.0;
      addCyl(0.18, 8.0, lambert({ color: 0xdfb47e }), lx + 0.3, ry, lz, { rx: Math.PI / 2, collide: true, sample: true });
    }
  };
  buildWallLadder(-18);
  buildWallLadder(18);

  // ─────────────────────────────────────────────────────────────────
  // 6. 뜀틀, 매트, 구름판 세트 2조 (표시와 충돌체 100% 일치)
  // ─────────────────────────────────────────────────────────────────
  gymGimmickState.springboards = [];

  // 구름판 전용 펄스 머티리얼 생성 (transparent: true 및 emissive 설정으로 실제 화면 반영)
  const createSpringboardMat = () => {
    return lambert({
      color: 0xe67e22,
      emissive: 0xd35400,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.92
    });
  };

  // A세트 (5단 대형 뜀틀 + 파란 매트 + 구름판)
  const setAX = -18, setAZ = 4;
  addBox(6.5, 4.8, 9.0, lambert({ color: 0xc89865 }), setAX, 2.4, setAZ);
  addBox(6.8, 0.8, 9.4, lambert({ color: 0xb07d4b }), setAX, 5.0, setAZ);
  addAABBCollider(setAX, 2.8, setAZ, 7.0, 5.8, 9.6);

  // 뜀판 A: rx 무시 문제를 해결하고, 바닥 베이스 + 밟는 상판이 충돌체와 정확히 일치하도록 2단 블록으로 구성
  addBox(4.6, 0.2, 6.0, lambert({ color: 0x5a381e }), setAX, 0.1, setAZ + 8.5, { collide: true, sample: false }); // 목재 베이스
  const spMatA = createSpringboardMat();
  const spA = addBox(4.4, 0.45, 5.6, spMatA, setAX, 0.425, setAZ + 8.5, { collide: true, sample: true }); // 탄성 상판 (충돌체 일치)
  gymGimmickState.springboards.push({ mesh: spA, mat: spMatA, x: setAX, z: setAZ + 8.5, label: "5단 구름판" });

  // 안전 착지 매트
  addBox(14, 1.8, 18, lambert({ color: 0x2980b9 }), setAX, 0.9, setAZ - 13.5, { collide: true, sample: true });
  addAABBCollider(setAX, 0.9, setAZ - 13.5, 14.2, 2.0, 18.2);

  // B세트 (3단 소형 뜀틀 + 초록 매트 + 구름판)
  const setBX = 18, setBZ = -6;
  addBox(5.5, 3.4, 7.5, lambert({ color: 0xc89865 }), setBX, 1.7, setBZ);
  addBox(5.8, 0.6, 7.8, lambert({ color: 0xb07d4b }), setBX, 3.6, setBZ);
  addAABBCollider(setBX, 2.0, setBZ, 6.0, 4.2, 8.0);

  // 뜀판 B: 표시와 충돌체가 정확히 일치하는 구조
  addBox(4.2, 0.2, 5.4, lambert({ color: 0x5a381e }), setBX, 0.1, setBZ + 7.5, { collide: true, sample: false });
  const spMatB = createSpringboardMat();
  const spB = addBox(4.0, 0.45, 5.0, spMatB, setBX, 0.425, setBZ + 7.5, { collide: true, sample: true });
  gymGimmickState.springboards.push({ mesh: spB, mat: spMatB, x: setBX, z: setBZ + 7.5, label: "3단 구름판" });

  addBox(12, 1.6, 15, lambert({ color: 0x27ae60 }), setBX, 0.8, setBZ - 11.5, { collide: true, sample: true });
  addAABBCollider(setBX, 0.8, setBZ - 11.5, 12.2, 1.8, 15.2);

  // ─────────────────────────────────────────────────────────────────
  // 7. 철망 볼 카트 2대 & 공들 (위장용 소품)
  // ─────────────────────────────────────────────────────────────────
  const buildBallCart = (bx, bz) => {
    addBox(6.5, 5.0, 8.0, lambert({ color: 0x7f8c8d }), bx, 3.0, bz, { collide: true, sample: false });
    addCyl(0.4, 0.3, lambert({ color: 0x2c3e50 }), bx - 2.8, 0.4, bz - 3.5, { rz: Math.PI / 2, collide: false });
    addCyl(0.4, 0.3, lambert({ color: 0x2c3e50 }), bx + 2.8, 0.4, bz - 3.5, { rz: Math.PI / 2, collide: false });
    addCyl(0.4, 0.3, lambert({ color: 0x2c3e50 }), bx - 2.8, 0.4, bz + 3.5, { rz: Math.PI / 2, collide: false });
    addCyl(0.4, 0.3, lambert({ color: 0x2c3e50 }), bx + 2.8, 0.4, bz + 3.5, { rz: Math.PI / 2, collide: false });

    const ballColors = [0xe67e22, 0xf39c12, 0xe74c3c, 0x3498db, 0xffffff];
    for (let k = 0; k < 8; k++) {
      const ox = (k % 2 - 0.5) * 2.2;
      const oz = (Math.floor(k / 2) % 2 - 0.5) * 3.0;
      const oy = 4.2 + Math.floor(k / 4) * 1.5;
      const col = ballColors[k % ballColors.length];
      const ballGeom = new THREE.SphereGeometry(0.75, 10, 10);
      const ballMesh = new THREE.Mesh(ballGeom, lambert({ color: col }));
      ballMesh.position.set(bx + ox, oy, bz + oz);
      ballMesh.userData.solid = false;
      mapRoot.add(ballMesh);
      samplables.push(ballMesh);
    }
  };
  buildBallCart(ROOM_W / 2 - 8, 22);
  buildBallCart(ROOM_W / 2 - 8, -20);

  // ─────────────────────────────────────────────────────────────────
  // 8. 체육관 소품: 심판 의자 + 주황색 트래픽 콘
  // ─────────────────────────────────────────────────────────────────
  const chairX = 0, chairZ = 35;
  addCyl(0.18, 10, lambert({ color: 0x34495e }), chairX - 1.5, 5.0, chairZ - 1.5, { collide: false });
  addCyl(0.18, 10, lambert({ color: 0x34495e }), chairX + 1.5, 5.0, chairZ - 1.5, { collide: false });
  addCyl(0.18, 10, lambert({ color: 0x34495e }), chairX - 1.5, 5.0, chairZ + 1.5, { collide: false });
  addCyl(0.18, 10, lambert({ color: 0x34495e }), chairX + 1.5, 5.0, chairZ + 1.5, { collide: false });
  addBox(4.0, 0.4, 4.0, lambert({ color: 0x34495e }), chairX, 9.8, chairZ, { collide: true, sample: true });
  addBox(4.0, 3.5, 0.4, lambert({ color: 0x34495e }), chairX, 11.5, chairZ + 1.8, { collide: true, sample: true });
  addAABBCollider(chairX, 6.0, chairZ, 4.5, 12.0, 4.5);

  const conePositions = [[-8, 20], [8, 20], [-8, -20], [8, -20]];
  conePositions.forEach(([cx, cz]) => {
    addCyl(0.8, 1.8, lambert({ color: 0xe67e22 }), cx, 0.9, cz, { rt: 0.15, collide: true, sample: true });
    addBox(1.8, 0.15, 1.8, lambert({ color: 0xe67e22 }), cx, 0.08, cz, { collide: false, sample: true });
  });

  // ─────────────────────────────────────────────────────────────────
  // 9. 스폰 지점 (Spawns): 충돌체 바깥 안전 바닥 배치
  // ─────────────────────────────────────────────────────────────────
  hiderSpawns.length = 0;
  const hiderCoords = [
    [-34, -28],  // 무대 단상 좌측 아래
    [34, -28],   // 무대 단상 우측 아래
    [-24, 0],    // 무대 단상 계단 앞
    [24, 0],     // 무대 단상 우측 계단 앞
    [-46, 12],   // 서쪽 농구대 뒤편
    [-46, -12],  // 서쪽 농구대 앞편
    [46, 12],    // 동쪽 농구대 뒤편
    [46, -12],   // 동쪽 농구대 앞편
    [-52, -24],  // 좌측 늑목 사이 바닥
    [-52, 24],   // 좌측 늑목 남측 바닥
    [-18, 18],   // 5단 뜀판 앞 통로
    [-18, -26],  // 파란 매트 너머 구석
    [18, 16],    // 3단 뜀판 앞 통로
    [18, -24],   // 초록 매트 너머 구석
    [42, 28],    // 1번 볼 카트 뒤
    [42, -26],   // 2번 볼 카트 뒤
    [-12, 34],   // 심판대 좌측
    [12, 34],    // 심판대 우측
    [-30, 28],   // 남서쪽 코너
    [30, 28]     // 남동쪽 코너
  ];
  hiderCoords.forEach(c => hiderSpawns.push(new THREE.Vector3(c[0], 0, c[1])));

  seekerSpawns.length = 0;
  const seekerCoords = [
    [-6, 0],
    [6, 0],
    [0, -6],
    [0, 6],
    [-4, -4],
    [4, 4]
  ];
  seekerCoords.forEach(c => seekerSpawns.push(new THREE.Vector3(c[0], 0, c[1])));
}

/**
 * 체육관 매 프레임 기믹 갱신 (실제 화면에 나타나는 시각 펄스)
 * @param {Object} ctx - 엔진 컨텍스트
 * @param {number} dt - 프레임 경과 시간 (초)
 */
export function updateGymnasiumGimmicks(ctx, dt) {
  if (!dt) return;
  gymGimmickState.animTime += dt;

  // 구름판 실제 화면 시각 펄스: opacity와 emissiveIntensity 동시 변조 (0.0 ~ 1.0 부드러운 호흡)
  const normSin = (Math.sin(gymGimmickState.animTime * 3.5) + 1) * 0.5; // 0.0 ~ 1.0
  gymGimmickState.springboards.forEach(sp => {
    if (sp.mat) {
      sp.mat.opacity = 0.82 + normSin * 0.16; // 0.82 ~ 0.98
      sp.mat.emissiveIntensity = 0.15 + normSin * 0.35; // 0.15 ~ 0.50
    }
  });

  // ※ 구름판 슈퍼 점프 기믹: 플레이어 물리 가속 계약 체결 전까지 보류
}

/**
 * 체육관 리소스 및 기믹 정리 (맵 전환 시 필수 호출)
 * @param {Object} ctx - 엔진 컨텍스트
 */
export function cleanupGymnasium(ctx) {
  gymGimmickState.springboards.forEach(sp => {
    if (sp.mat && typeof sp.mat.dispose === "function") {
      sp.mat.dispose();
    }
  });
  gymGimmickState.springboards = [];
  gymGimmickState.animTime = 0;
}
