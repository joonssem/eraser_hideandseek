/**
 * 🎹 maps/music_room.js - 음악실 (Music Room)
 * 
 * 《교실 대소동: 사라진 지우개 찾기》 독립 맵 모듈
 * - 의존성 주입(ctx) 패턴 준수
 * - setWallHeight(35) 계약 준수
 * - Zero-Asset 원칙: Three.js 절차적 지오메트리 & 2D Canvas 텍스처
 * - 표준 생명주기: MUSIC_ROOM_MAP, buildMusicRoom, updateMusicRoomGimmicks, cleanupMusicRoom
 * - 오디오 정책: Web Audio 무단 자동 재생 금지, 사운드 기믹은 사용자 인터랙션 계약 전까지 보류
 */

export const MUSIC_ROOM_MAP = {
  id: "music_room",
  name: "음악실",
  icon: "🎹"
};

// 기믹 상태 관리 (모듈 내부 격리)
let musicRoomGimmickState = {
  metronomeArm: null,
  disposableMaterials: [],
  animTime: 0
};

/**
 * 음악실 3D 공간 생성
 * @param {Object} ctx - 엔진 주입 컨텍스트
 */
export function buildMusicRoom(ctx) {
  const {
    THREE, mapRoot, ROOM_W, ROOM_D,
    addBox, addCyl, canvasTex, lambert,
    addAABBCollider, samplables, colliders,
    refillZones, hiderSpawns, seekerSpawns,
    buildRoomShell, setWallHeight
  } = ctx;

  // 1. 벽 높이 설정: 음악실 층고 (35 유닛)
  const WALL_H = 35;
  if (typeof setWallHeight === "function") {
    setWallHeight(WALL_H);
  }

  // 머티리얼 해제 추적 헬퍼
  const trackMat = (m) => {
    musicRoomGimmickState.disposableMaterials.push(m);
    return m;
  };

  // 2. 바닥 텍스처 (차음재 카펫 & 우드 보더 & 오선지 음표 텍스처)
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    // 따뜻한 와인-초콜릿 차음 카펫 베이스
    g.fillStyle = "#3e2723";
    g.fillRect(0, 0, w, h);

    // 격자 타일 라인
    g.strokeStyle = "rgba(93, 64, 55, 0.4)";
    g.lineWidth = 3;
    for (let i = 0; i <= w; i += 64) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke();
    }

    // 오선지 라인 (음악실 아이덴티티)
    g.strokeStyle = "rgba(239, 235, 233, 0.22)";
    g.lineWidth = 2;
    const staffY = [120, 132, 144, 156, 168, 360, 372, 384, 396, 408];
    staffY.forEach(y => {
      g.beginPath(); g.moveTo(20, y); g.lineTo(w - 20, y); g.stroke();
    });

    // 4분음표, 8분음표, 높은음자리표 느낌의 절차적 장식
    g.fillStyle = "rgba(255, 236, 179, 0.28)";
    const notes = [
      { x: 90, y: 140 }, { x: 180, y: 128 }, { x: 270, y: 152 }, { x: 380, y: 136 },
      { x: 120, y: 380 }, { x: 230, y: 368 }, { x: 330, y: 392 }, { x: 420, y: 376 }
    ];
    notes.forEach(n => {
      g.beginPath();
      g.ellipse(n.x, n.y, 10, 7, -Math.PI / 6, 0, Math.PI * 2);
      g.fill();
      g.fillRect(n.x + 7, n.y - 28, 3, 28);
    });
  }, 4, 4);

  // 룸 쉘 생성 (바닥, 벽, 천장, 걸레받이)
  buildRoomShell(lambert({ map: floorTex }), 0x423632, 0xf7f4eb, 0x2b1d19);

  // ─────────────────────────────────────────────────────────────────
  // 3. 전면 (-Z): 3단 계단식 합창석 마루 (Choral Risers)
  // ─────────────────────────────────────────────────────────────────
  const riserZ = -ROOM_D / 2 + 15;
  const riserWood = lambert({ color: 0x8d6e63 });
  const riserTop = lambert({ color: 0xbcaaa4 });

  // 1단 (하단): 너비 72, 높이 1.4, 깊이 8
  addBox(72, 1.4, 8, riserWood, 0, 0.7, riserZ + 8);
  addBox(72.5, 0.25, 8.5, riserTop, 0, 1.45, riserZ + 8);
  addAABBCollider(0, 0.8, riserZ + 8, 73, 1.7, 8.8);

  // 2단 (중단): 너비 64, 높이 2.8, 깊이 8
  addBox(64, 2.8, 8, riserWood, 0, 1.4, riserZ);
  addBox(64.5, 0.25, 8.5, riserTop, 0, 2.85, riserZ);
  addAABBCollider(0, 1.5, riserZ, 65, 3.1, 8.8);

  // 3단 (상단): 너비 56, 높이 4.2, 깊이 8
  addBox(56, 4.2, 8, riserWood, 0, 2.1, riserZ - 8);
  addBox(56.5, 0.25, 8.5, riserTop, 0, 4.25, riserZ - 8);
  addAABBCollider(0, 2.2, riserZ - 8, 57, 4.5, 8.8);

  // ─────────────────────────────────────────────────────────────────
  // 4. 그랜드 피아노 (Grand Piano & Keys)
  // ─────────────────────────────────────────────────────────────────
  const pianoX = -26, pianoZ = 16;
  const pianoBodyMat = lambert({ color: 0x181818 });
  const pianoGoldMat = lambert({ color: 0xd4af37 });

  // 피아노 메인 바디
  addBox(14, 3.6, 18, pianoBodyMat, pianoX, 4.6, pianoZ);
  addBox(10, 3.4, 10, pianoBodyMat, pianoX + 2, 4.5, pianoZ - 6);
  addAABBCollider(pianoX + 1, 4.0, pianoZ - 1, 15, 4.8, 22);

  // 피아노 열린 뚜껑 (비스듬한 표현을 위한 상판 엣지)
  addBox(14.4, 0.4, 18.4, pianoBodyMat, pianoX, 6.6, pianoZ);
  addCyl(0.12, 4.5, pianoGoldMat, pianoX + 5, 8.4, pianoZ, { ry: 0, collide: false, sample: false }); // 뚜껑 받침대

  // 피아노 다리 3개
  addCyl(0.65, 3.0, pianoBodyMat, pianoX - 5.5, 1.5, pianoZ + 7.5, { collide: true, sample: false });
  addCyl(0.65, 3.0, pianoBodyMat, pianoX + 5.5, 1.5, pianoZ + 7.5, { collide: true, sample: false });
  addCyl(0.65, 3.0, pianoBodyMat, pianoX, 1.5, pianoZ - 9.0, { collide: true, sample: false });

  // 페달 장치
  addBox(2.2, 1.2, 1.0, pianoBodyMat, pianoX, 0.6, pianoZ + 5.0, { collide: false, sample: false });
  [-0.6, 0, 0.6].forEach(px => {
    addBox(0.25, 0.15, 0.9, pianoGoldMat, pianoX + px, 0.2, pianoZ + 5.6, { collide: false, sample: false });
  });

  // 피아노 건반대 (Keyboard Bed)
  addBox(12.0, 0.8, 4.0, pianoBodyMat, pianoX, 3.8, pianoZ + 10.5, { collide: true, sample: false });

  // 흰 건반 (White Keys - 14개, 지우개 완벽 위장용)
  const whiteKeyMat = trackMat(lambert({ color: 0xfafafa }));
  const numWhiteKeys = 14;
  const keyStartX = pianoX - 5.2;
  for (let k = 0; k < numWhiteKeys; k++) {
    const kx = keyStartX + k * 0.8;
    addBox(0.72, 0.35, 2.8, whiteKeyMat, kx, 4.35, pianoZ + 10.6, { collide: false, sample: true });
  }

  // 검은 건반 (Black Keys - 10개)
  const blackKeyMat = trackMat(lambert({ color: 0x111111 }));
  const blackKeyOffsets = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12];
  blackKeyOffsets.forEach(idx => {
    const bx = keyStartX + idx * 0.8 + 0.4;
    addBox(0.42, 0.5, 1.8, blackKeyMat, bx, 4.6, pianoZ + 10.1, { collide: false, sample: true });
  });

  // 보면대 및 악보
  addBox(9.0, 2.2, 0.3, pianoBodyMat, pianoX, 6.0, pianoZ + 7.8, { collide: false, sample: false });
  const musicSheetTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = "#fffef8";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#222222";
    g.lineWidth = 1.5;
    for (let l = 20; l < h - 20; l += 14) {
      g.beginPath(); g.moveTo(10, l); g.lineTo(w - 10, l); g.stroke();
    }
  });
  addBox(7.5, 1.8, 0.05, lambert({ map: musicSheetTex }), pianoX, 6.0, pianoZ + 7.95, { collide: false, sample: true });

  // 피아노 의자 (Piano Bench)
  const benchMat = lambert({ color: 0x5c1d24 }); // 버건디 벨벳
  addBox(6.8, 1.2, 2.8, benchMat, pianoX, 2.4, pianoZ + 14.5, { collide: true, sample: true });
  addAABBCollider(pianoX, 1.5, pianoZ + 14.5, 7.2, 2.6, 3.2);
  [-2.8, 2.8].forEach(bx => {
    [-1.0, 1.0].forEach(bz => {
      addCyl(0.3, 2.0, pianoBodyMat, pianoX + bx, 1.0, pianoZ + 14.5 + bz, { collide: false, sample: false });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 5. 무지개 실로폰 / 글로켄슈필 (Rainbow Xylophone - 8색 건반)
  // ─────────────────────────────────────────────────────────────────
  const xyX = 26, xyZ = 16;
  const xyWoodMat = lambert({ color: 0xa1887f });

  // 실로폰 목재 스탠드
  addBox(14.0, 0.8, 6.5, xyWoodMat, xyX, 3.8, xyZ);
  addAABBCollider(xyX, 2.2, xyZ, 14.5, 4.4, 7.0);

  // 스탠드 다리 4개
  [-6.0, 6.0].forEach(lx => {
    [-2.5, 2.5].forEach(lz => {
      addCyl(0.35, 3.6, xyWoodMat, xyX + lx, 1.8, xyZ + lz, { collide: false, sample: false });
    });
  });

  // 8색 무지개 음판 (도-레-미-파-솔-라-시-도)
  const rainbowColors = [
    0xe74c3c, // 빨 (도) - 길이 7.5
    0xe67e22, // 주 (레) - 길이 7.0
    0xf1c40f, // 노 (미) - 길이 6.5
    0x2ecc71, // 초 (파) - 길이 6.0
    0x1abc9c, // 청록 (솔) - 길이 5.5
    0x3498db, // 파 (라) - 길이 5.0
    0x2980b9, // 남 (시) - 길이 4.5
    0x9b59b6  // 보 (높은 도) - 길이 4.0
  ];

  rainbowColors.forEach((col, idx) => {
    const kx = xyX - 5.25 + idx * 1.5;
    const kLen = 7.5 - idx * 0.45;
    const barMat = trackMat(lambert({ color: col }));
    addBox(1.15, 0.4, kLen, barMat, kx, 4.35, xyZ, { collide: true, sample: true });
  });

  // 실로폰 말렛(채) 2개
  const malletMat = lambert({ color: 0xffffff });
  [-1.5, 1.5].forEach(mx => {
    addCyl(0.08, 3.5, xyWoodMat, xyX + mx, 4.65, xyZ + 2.5, { rx: Math.PI / 3, collide: false, sample: false });
    addCyl(0.35, 0.35, malletMat, xyX + mx + 0.2, 4.85, xyZ + 3.4, { collide: false, sample: true });
  });

  // ─────────────────────────────────────────────────────────────────
  // 6. 국악기 코너 (Traditional Korean Instruments: 장구 & 대북)
  // ─────────────────────────────────────────────────────────────────
  const korX = 35, korZ = 34;
  const jangguMat = lambert({ color: 0xb71c1c }); // 붉은 옻칠
  const drumSkinMat = lambert({ color: 0xf5deb3 }); // 양가죽/말가죽

  // 장구 (모래시계형 구조)
  addCyl(1.8, 1.8, drumSkinMat, korX - 4.5, 2.0, korZ - 1.6, { rx: Math.PI / 2, collide: true, sample: true });
  addCyl(0.8, 2.0, jangguMat, korX - 4.5, 2.0, korZ, { rx: Math.PI / 2, collide: true, sample: true });
  addCyl(1.8, 1.8, drumSkinMat, korX - 4.5, 2.0, korZ + 1.6, { rx: Math.PI / 2, collide: true, sample: true });
  addAABBCollider(korX - 4.5, 2.0, korZ, 4.0, 4.0, 5.5);

  // 장구 받침대 (X자 목재)
  addBox(3.5, 0.4, 4.5, xyWoodMat, korX - 4.5, 0.2, korZ, { collide: false, sample: false });

  // 대북 (Grand Drum)
  const drumStandMat = lambert({ color: 0x3e2723 });
  addCyl(3.2, 4.0, jangguMat, korX + 5.0, 4.5, korZ, { rx: Math.PI / 2, collide: true, sample: true });
  addCyl(3.15, 0.2, drumSkinMat, korX + 5.0, 4.5, korZ - 2.05, { rx: Math.PI / 2, collide: false, sample: true });
  addCyl(3.15, 0.2, drumSkinMat, korX + 5.0, 4.5, korZ + 2.05, { rx: Math.PI / 2, collide: false, sample: true });
  addAABBCollider(korX + 5.0, 4.5, korZ, 6.8, 6.8, 4.8);

  // 대북 3각 받침대
  [-2.2, 2.2].forEach(dx => {
    addCyl(0.3, 3.5, drumStandMat, korX + 5.0 + dx, 1.75, korZ - 1.5, { collide: false, sample: false });
    addCyl(0.3, 3.5, drumStandMat, korX + 5.0 + dx, 1.75, korZ + 1.5, { collide: false, sample: false });
  });

  // ─────────────────────────────────────────────────────────────────
  // 7. 보면대 숲 (Forest of 12 Music Stands)
  // ─────────────────────────────────────────────────────────────────
  const standPoleMat = lambert({ color: 0x212121 });
  const standDeskMat = lambert({ color: 0x263238 });
  const standSheetMat = lambert({ map: musicSheetTex });

  const buildMusicStand = (sx, sy, sz) => {
    // 1. 삼각 바닥 베이스
    addCyl(0.8, 0.15, standPoleMat, sx, sy + 0.08, sz, { collide: false, sample: false });
    // 2. 조절식 기둥
    addCyl(0.12, 5.0, standPoleMat, sx, sy + 2.6, sz, { collide: true, sample: false });
    // 3. 각도 조절 보면판
    addBox(3.4, 2.4, 0.25, standDeskMat, sx, sy + 5.2, sz, { collide: true, sample: true });
    // 4. 악보 시트
    addBox(2.8, 2.0, 0.05, standSheetMat, sx, sy + 5.2, sz + 0.16, { collide: false, sample: true });
    // 5. 안전 충돌체 (얇은 기둥 관통 방지)
    addAABBCollider(sx, sy + 3.0, sz, 3.6, 5.8, 1.2);
  };

  // 합창단 단상 및 전면 플로어에 고르게 분산된 보면대 12개
  const standCoords = [
    // 합창석 1단 (y: 1.45)
    [-24, 1.45, riserZ + 8],
    [-8, 1.45, riserZ + 8],
    [8, 1.45, riserZ + 8],
    [24, 1.45, riserZ + 8],
    // 합창석 2단 (y: 2.85)
    [-18, 2.85, riserZ],
    [0, 2.85, riserZ],
    [18, 2.85, riserZ],
    // 합창석 3단 (y: 4.25)
    [-12, 4.25, riserZ - 8],
    [12, 4.25, riserZ - 8],
    // 바닥 플로어 (중앙 오케스트라 영역 y: 0)
    [-10, 0, 30],
    [6, 0, 32],
    [18, 0, 30]
  ];
  standCoords.forEach(([sx, sy, sz]) => buildMusicStand(sx, sy, sz));

  // ─────────────────────────────────────────────────────────────────
  // 8. 선생님 지휘 단상 & 메트로놈 (Visual Metronome Gimmick)
  // ─────────────────────────────────────────────────────────────────
  const podiumX = 0, podiumZ = 4;
  addBox(6.5, 0.7, 5.5, lambert({ color: 0x4e342e }), podiumX, 0.35, podiumZ);
  addAABBCollider(podiumX, 0.4, podiumZ, 6.8, 0.9, 5.8);

  // 지휘자 전용 대형 보면대
  buildMusicStand(podiumX, 0.7, podiumZ - 1.8);

  // 메트로놈 협탁
  const tableMat = lambert({ color: 0x5d4037 });
  addBox(2.8, 3.2, 2.8, tableMat, podiumX + 4.5, 1.6, podiumZ);
  addAABBCollider(podiumX + 4.5, 1.6, podiumZ, 3.0, 3.4, 3.0);

  // 메트로놈 본체 (삼각뿔을 닮은 목재 케이스)
  const metroCaseMat = lambert({ color: 0x3e2723 });
  addBox(1.0, 1.4, 0.9, metroCaseMat, podiumX + 4.5, 3.9, podiumZ, { collide: true, sample: true });

  // 메트로놈 흔들리는 진자 (Arm) - 시각 기믹
  const armGroup = new THREE.Group();
  armGroup.position.set(podiumX + 4.5, 3.4, podiumZ + 0.48);

  const armRod = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.04), pianoGoldMat);
  armRod.position.y = 0.55;
  armGroup.add(armRod);

  const armWeight = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.12), pianoGoldMat);
  armWeight.position.y = 0.75;
  armGroup.add(armWeight);

  mapRoot.add(armGroup);
  musicRoomGimmickState.metronomeArm = armGroup;

  // ─────────────────────────────────────────────────────────────────
  // 9. 벽면 악기 보관 수납장 & 리필존 (Instrument Storage Cabinet)
  // ─────────────────────────────────────────────────────────────────
  const cabX = -ROOM_W / 2 + 2.2, cabZ = -6;
  const cabMat = lambert({ color: 0x4e342e });
  const glassMat = lambert({ color: 0xb0bec5, transparent: true, opacity: 0.55 });

  // 대형 보관장 외곽 프레임
  addBox(2.4, 16.0, 28.0, cabMat, cabX, 8.0, cabZ);
  addAABBCollider(cabX, 8.0, cabZ, 2.8, 16.2, 28.4);

  // 선반 및 투명 유리문
  [-4, 0, 4, 8, 12].forEach(sy => {
    addBox(2.2, 0.4, 27.0, cabMat, cabX, sy, cabZ, { collide: false, sample: false });
  });
  addBox(0.2, 14.8, 27.0, glassMat, cabX + 1.2, 8.0, cabZ, { collide: false, sample: true });

  // 비품함 리필존 등록
  refillZones.push({
    x: cabX + 4.0,
    z: cabZ,
    r: 6.5,
    yMin: 0,
    yMax: 10,
    label: "악기 보관장"
  });

  // ─────────────────────────────────────────────────────────────────
  // 10. 스폰 지점 (Spawns): 충돌체 바깥 안전 바닥(y=0) 배치
  // ─────────────────────────────────────────────────────────────────
  hiderSpawns.length = 0;
  const hiderCoords = [
    // 1~6. 합창석 AABB 바깥 좌우 빈 바닥 통로 (y=0)
    [-42, -40],   // 합창석 3단 좌측 바닥 통로
    [-42, -32],   // 합창석 2단 좌측 바닥 통로
    [-42, -24],   // 합창석 1단 좌측 바닥 통로
    [42, -40],    // 합창석 3단 우측 바닥 통로
    [42, -32],    // 합창석 2단 우측 바닥 통로
    [42, -24],    // 합창석 1단 우측 바닥 통로
    // 7. 합창석 앞 중앙 바닥 통로
    [0, -16],
    // 8~10. 그랜드 피아노 주변 바닥
    [-36, 16],    // 피아노 좌측 바닥
    [-26, 0],     // 피아노 북측 바닥
    [-14, 16],    // 피아노 우측 통로
    // 11~13. 실로폰 주변 바닥
    [15, 16],     // 실로폰 좌측 바닥
    [37, 16],     // 실로폰 우측 바닥
    [26, 6],      // 실로폰 북측 바닥
    // 14~16. 국악기 코너 바닥
    [24, 34],     // 장구 앞 바닥
    [35, 42],     // 대북 남측 바닥
    [45, 40],     // 남동쪽 구석 바닥
    // 17~18. 보면대 숲 및 통로
    [-36, 36],    // 남서쪽 코너 바닥
    [-4, 22],     // 플로어 중앙 통로 바닥
    // 19~20. 악기 보관장 앞 바닥
    [-38, -18],   // 악기장 북측 바닥
    [-38, 6]      // 악기장 남측 바닥
  ];
  hiderCoords.forEach(c => hiderSpawns.push(new THREE.Vector3(c[0], 0, c[1])));

  seekerSpawns.length = 0;
  const seekerCoords = [
    [-6, 10],
    [6, 10],
    [0, 8],
    [0, 14],
    [-4, 12],
    [4, 12]
  ];
  seekerCoords.forEach(c => seekerSpawns.push(new THREE.Vector3(c[0], 0, c[1])));
}

/**
 * 음악실 매 프레임 기믹 갱신
 * @param {Object} ctx - 엔진 컨텍스트
 * @param {number} dt - 프레임 경과 시간 (초)
 */
export function updateMusicRoomGimmicks(ctx, dt) {
  if (!dt) return;
  musicRoomGimmickState.animTime += dt;

  // 메트로놈 진자 시각 애니메이션 (왕복 진동)
  if (musicRoomGimmickState.metronomeArm) {
    const swingAngle = Math.sin(musicRoomGimmickState.animTime * 3.8) * 0.42; // ±24도 왕복
    musicRoomGimmickState.metronomeArm.rotation.z = swingAngle;
  }

  // ※ 소리 나는 피아노 계단 기믹:
  // Web Audio 브라우저 정책 준수 및 플레이어 발판 인터랙션 계약 전까지 보류
}

/**
 * 음악실 리소스 및 기믹 정리 (맵 전환 시 필수 호출)
 * @param {Object} ctx - 엔진 컨텍스트
 */
export function cleanupMusicRoom(ctx) {
  musicRoomGimmickState.disposableMaterials.forEach(m => {
    if (m && typeof m.dispose === "function") {
      m.dispose();
    }
  });
  musicRoomGimmickState.disposableMaterials = [];
  musicRoomGimmickState.metronomeArm = null;
  musicRoomGimmickState.animTime = 0;
}
