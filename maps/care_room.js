/**
 * 🧸 maps/care_room.js - 돌봄교실 / 늘봄교실 (Care Room)
 *
 * 《교실 대소동: 사라진 지우개 찾기》 독립 맵 모듈
 * - 의존성 주입(ctx) 패턴 준수
 * - setWallHeight(33) 계약 준수 (아늑하고 안전한 저학년 방과후 보육 공간)
 * - Zero-Asset 원칙: Three.js 절차적 지오메트리 & 2D Canvas 텍스처
 * - 표준 생명주기: CARE_ROOM_MAP, buildCareRoom, updateCareRoomGimmicks, cleanupCareRoom
 * - 움직이는 기차: 프레임 기반(dt) 순환 주행, setInterval 배제, cleanup 시 완벽 정리
 * - 보류 기능: 기차 탑승 및 플레이어 물리 연동은 엔진 계약 확정 전까지 안전하게 보류
 */

export const CARE_ROOM_MAP = {
  id: "care_room",
  name: "돌봄교실",
  icon: "🧸"
};

// ─────────────────────────────────────────────────────────────────
// 기차 주행 궤도 파라미터 (모듈 상수)
// - 코너 중심: X = ±16, Z = 14 / 반지름 R = 18
// - 직선 구간: North (Z = -4, X: 16 -> -16), South (Z = 32, X: -16 -> 16)
// - 전체 둘레 L = 2 * 32 + 2 * PI * 18 = 64 + 113.097 = 177.097 유닛
// - 속도: 7.2 유닛/초 (1바퀴 주행 약 24.6초 소요)
// ─────────────────────────────────────────────────────────────────
const TRAIN_TRACK = {
  cxLeft: -16,
  cxRight: 16,
  cz: 14,
  radius: 18,
  straightLen: 32, // |16 - (-16)|
  speed: 7.2,
  wheelSpeed: 6.0
};
const TRACK_HALF_CIRC = Math.PI * TRAIN_TRACK.radius; // 56.5487
const TRACK_TOTAL_LEN = 2 * TRAIN_TRACK.straightLen + 2 * TRACK_HALF_CIRC; // 177.097

/**
 * 궤도 상의 거리 d(0 ~ TRACK_TOTAL_LEN)에 따른 (x, z) 위치 및 진행 각도(theta) 계산
 */
function getTrackPoint(dist) {
  let d = ((dist % TRACK_TOTAL_LEN) + TRACK_TOTAL_LEN) % TRACK_TOTAL_LEN;
  const { cxLeft, cxRight, cz, radius, straightLen } = TRAIN_TRACK;

  // 세그먼트 1: 북측 직선 (오른쪽 -> 왼쪽: X = 16 -> -16, Z = cz - radius = -4)
  if (d < straightLen) {
    const t = d / straightLen;
    return {
      x: cxRight - t * straightLen,
      z: cz - radius,
      angle: -Math.PI / 2 // 서쪽(-X) 진행 yaw
    };
  }
  d -= straightLen;

  // 세그먼트 2: 서측 반원 (North -> South: Z = -4 -> 32, 중심 cxLeft, cz)
  if (d < TRACK_HALF_CIRC) {
    const t = d / TRACK_HALF_CIRC; // 0 ~ 1
    const x = cxLeft - Math.sin(t * Math.PI) * radius;
    const z = cz - Math.cos(t * Math.PI) * radius;
    const angle = -Math.PI / 2 + t * Math.PI;
    return { x, z, angle };
  }
  d -= TRACK_HALF_CIRC;

  // 세그먼트 3: 남측 직선 (왼쪽 -> 오른쪽: X = -16 -> 16, Z = cz + radius = 32)
  if (d < straightLen) {
    const t = d / straightLen;
    return {
      x: cxLeft + t * straightLen,
      z: cz + radius,
      angle: Math.PI / 2 // 동쪽(+X) 진행 yaw
    };
  }
  d -= straightLen;

  // 세그먼트 4: 동측 반원 (South -> North: Z = 32 -> -4, 중심 cxRight, cz)
  const t = d / TRACK_HALF_CIRC;
  const x = cxRight + Math.sin(t * Math.PI) * radius;
  const z = cz + Math.cos(t * Math.PI) * radius;
  const angle = Math.PI / 2 + t * Math.PI;
  return { x, z, angle };
}

// 기믹 상태 관리 (모듈 내부 격리)
let careRoomGimmickState = {
  disposableMaterials: [],
  disposableGeometries: [],
  trainGroup: null,
  locomotive: null,
  tender: null,
  wagon: null,
  wheels: [],
  animTime: 0
};

/**
 * 돌봄교실 3D 공간 생성
 * @param {Object} ctx - 엔진 주입 컨텍스트
 */
export function buildCareRoom(ctx) {
  const {
    THREE, mapRoot, ROOM_W, ROOM_D,
    addBox, addCyl, canvasTex, lambert,
    addAABBCollider, samplables, colliders,
    refillZones, hiderSpawns, seekerSpawns,
    buildRoomShell, setWallHeight
  } = ctx;

  // 1. 벽 높이 설정: 돌봄교실 표준 층고 (33 유닛)
  const WALL_H = 33;
  if (typeof setWallHeight === "function") {
    setWallHeight(WALL_H);
  }

  // 머티리얼/지오메트리 해제 추적 헬퍼
  const trackMat = (m) => {
    careRoomGimmickState.disposableMaterials.push(m);
    return m;
  };
  const trackGeom = (g) => {
    careRoomGimmickState.disposableGeometries.push(g);
    return g;
  };

  // 2. 바닥 텍스처 (4색 EVA 사각 퍼즐 조립 매트: 노랑, 분홍, 하늘, 연두)
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    // 따뜻한 우드 비닐 장판 바탕
    g.fillStyle = "#e0cfb8";
    g.fillRect(0, 0, w, h);

    // 4분할 파스텔 EVA 퍼즐 매트
    const colors = ["#fff59d", "#f8bbd0", "#b3e5fc", "#c8e6c9"]; // 노랑, 분홍, 하늘, 연두
    const borderColors = ["#fbc02d", "#f06292", "#4fc3f7", "#81c784"];
    const halfW = w / 2;
    const halfH = h / 2;

    const tiles = [
      { x: 0, y: 0, c: colors[0], bc: borderColors[0] },
      { x: halfW, y: 0, c: colors[1], bc: borderColors[1] },
      { x: 0, y: halfH, c: colors[2], bc: borderColors[2] },
      { x: halfW, y: halfH, c: colors[3], bc: borderColors[3] }
    ];

    tiles.forEach(t => {
      g.fillStyle = t.c;
      g.fillRect(t.x + 4, t.y + 4, halfW - 8, halfH - 8);
      g.strokeStyle = t.bc;
      g.lineWidth = 4;
      g.strokeRect(t.x + 4, t.y + 4, halfW - 8, halfH - 8);

      // 퍼즐 톱니 요철 느낌의 텍스처 디테일
      g.fillStyle = t.bc;
      g.beginPath();
      g.arc(t.x + halfW / 2, t.y + 4, 14, 0, Math.PI);
      g.fill();
      g.beginPath();
      g.arc(t.x + 4, t.y + halfH / 2, 14, -Math.PI / 2, Math.PI / 2);
      g.fill();
    });

    // 귀여운 장난감 별·하트 미세 스탬프 패턴
    g.fillStyle = "rgba(255, 255, 255, 0.45)";
    for (let i = 0; i < 20; i++) {
      const sx = (i * 89) % w;
      const sy = (i * 107) % h;
      g.fillRect(sx, sy, 5, 5);
    }
  }, 4, 3);

  // 룸 쉘 생성 (바닥: EVA 퍼즐 매트, 벽: 파스텔 크림옐로, 천장: 소프트 화이트, 걸레받이: 파스텔 우드)
  buildRoomShell(lambert({ map: floorTex }), 0xfffde7, 0xfafafa, 0x8d6e63);

  // ─────────────────────────────────────────────────────────────────
  // 공통 머티리얼 정의
  // ─────────────────────────────────────────────────────────────────
  const woodMat = trackMat(lambert({ color: 0xd7ccc8 }));
  const woodDarkMat = trackMat(lambert({ color: 0x8d6e63 }));
  const pastelYellow = trackMat(lambert({ color: 0xfff59d }));
  const pastelPink = trackMat(lambert({ color: 0xf8bbd0 }));
  const pastelBlue = trackMat(lambert({ color: 0x90caf9 }));
  const pastelGreen = trackMat(lambert({ color: 0xa5d6a7 }));
  const brightRed = trackMat(lambert({ color: 0xe53935 }));
  const brightYellow = trackMat(lambert({ color: 0xfbc02d }));
  const brightBlue = trackMat(lambert({ color: 0x1976d2 }));
  const darkMetal = trackMat(lambert({ color: 0x37474f }));
  const silverMat = trackMat(lambert({ color: 0xcfd8dc }));
  const whiteMat = trackMat(lambert({ color: 0xffffff }));

  // ─────────────────────────────────────────────────────────────────
  // 3. 중앙: 저학년 좌식 원형 테이블 & 스툴 & 블록 정리함
  // ─────────────────────────────────────────────────────────────────
  // 원형 좌식 테이블 (X = -8, Z = 14)
  addCyl(5.5, 0.5, pastelYellow, -8, 2.2, 14, { collide: true, sample: true });
  addCyl(0.8, 2.0, woodDarkMat, -8, 1.0, 14, { collide: false, sample: false }); // 다리
  addAABBCollider(-8, 1.3, 14, 11.2, 2.6, 11.2);

  // 원형 좌식 테이블 주변 작은 쿠션 스툴 3개
  addCyl(1.2, 0.8, pastelPink, -12.5, 0.4, 11, { collide: true, sample: true });
  addCyl(1.2, 0.8, pastelBlue, -3.5, 0.4, 11, { collide: true, sample: true });
  addCyl(1.2, 0.8, pastelGreen, -8, 0.4, 18.5, { collide: true, sample: true });

  // 두 번째 원형 좌식 테이블 (X = +8, Z = 14)
  addCyl(5.5, 0.5, pastelBlue, 8, 2.2, 14, { collide: true, sample: true });
  addCyl(0.8, 2.0, woodDarkMat, 8, 1.0, 14, { collide: false, sample: false });
  addAABBCollider(8, 1.3, 14, 11.2, 2.6, 11.2);

  // 쿠션 스툴 3개
  addCyl(1.2, 0.8, pastelYellow, 3.5, 0.4, 17, { collide: true, sample: true });
  addCyl(1.2, 0.8, pastelPink, 12.5, 0.4, 17, { collide: true, sample: true });
  addCyl(1.2, 0.8, pastelGreen, 8, 0.4, 9.5, { collide: true, sample: true });

  // 대형 레고 블록 바구니 2조
  // 블록 바구니 1 (X = -12, Z = 24)
  addBox(5.0, 3.0, 4.0, pastelGreen, -12, 1.5, 24, { collide: true, sample: true });
  addAABBCollider(-12, 1.5, 24, 5.4, 3.2, 4.4);
  // 바구니 속 알록달록 블록들 (스포이드 위장용 소품)
  addBox(1.2, 0.8, 1.6, brightRed, -12.5, 3.2, 23.5, { collide: false, sample: true });
  addBox(1.4, 0.8, 1.2, brightBlue, -11.5, 3.2, 24.5, { collide: false, sample: true });

  // 블록 바구니 2 (X = +12, Z = 24)
  addBox(5.0, 3.0, 4.0, pastelPink, 12, 1.5, 24, { collide: true, sample: true });
  addAABBCollider(12, 1.5, 24, 5.4, 3.2, 4.4);
  addBox(1.2, 0.8, 1.6, brightYellow, 11.5, 3.2, 23.5, { collide: false, sample: true });
  addBox(1.4, 0.8, 1.2, brightGreenMat(), 12.5, 3.2, 24.5, { collide: false, sample: true });

  function brightGreenMat() {
    return trackMat(lambert({ color: 0x43a047 }));
  }

  // ─────────────────────────────────────────────────────────────────
  // 4. 북서쪽: 인디언 미니 텐트 & 봉제 인형 아늑한 쉼터
  //    (※ 완전 밀폐 방지: 전면이 개방된 삼각 티피 텐트)
  // ─────────────────────────────────────────────────────────────────
  const tentX = -38;
  const tentZ = -28;
  const tentMat = trackMat(lambert({ color: 0xfff8e1, side: THREE.DoubleSide }));

  // 인디언 텐트 목재 기둥 4개 (피라미드 지지대)
  addCyl(0.25, 14, woodDarkMat, tentX - 3.2, 6.2, tentZ - 3.2, { collide: false, sample: false, rx: 0.22, rz: -0.22 });
  addCyl(0.25, 14, woodDarkMat, tentX + 3.2, 6.2, tentZ - 3.2, { collide: false, sample: false, rx: 0.22, rz: 0.22 });
  addCyl(0.25, 14, woodDarkMat, tentX - 3.2, 6.2, tentZ + 3.2, { collide: false, sample: false, rx: -0.22, rz: -0.22 });
  addCyl(0.25, 14, woodDarkMat, tentX + 3.2, 6.2, tentZ + 3.2, { collide: false, sample: false, rx: -0.22, rz: 0.22 });

  // 텐트 캔버스 천 (후면 및 좌우 3면만 가림막 형성, 전면 +Z는 오픈 통로)
  addBox(7.2, 9.0, 0.25, tentMat, tentX, 4.5, tentZ - 3.5, { collide: false, sample: true }); // 뒷면
  addBox(0.25, 9.0, 7.2, tentMat, tentX - 3.5, 4.5, tentZ, { collide: false, sample: true }); // 좌측면
  addBox(0.25, 9.0, 7.2, tentMat, tentX + 3.5, 4.5, tentZ, { collide: false, sample: true }); // 우측면

  // 텐트 내부 부드러운 원형 매트
  addCyl(3.8, 0.2, pastelPink, tentX, 0.1, tentZ, { collide: false, sample: true });
  // 텐트 몸체 충돌체 (플레이어가 텐트 내부에 들어갈 수 있으며 외곽 벽만 보호)
  addAABBCollider(tentX, 5.0, tentZ - 3.5, 7.6, 10.0, 0.8);
  addAABBCollider(tentX - 3.5, 5.0, tentZ, 0.8, 10.0, 7.6);
  addAABBCollider(tentX + 3.5, 5.0, tentZ, 0.8, 10.0, 7.6);

  // 텐트 옆 봉제인형 무더기 바구니
  const bearMat = trackMat(lambert({ color: 0x8d6e63 }));
  const rabbitMat = trackMat(lambert({ color: 0xf5f5f5 }));
  addBox(4.4, 2.5, 4.4, pastelYellow, tentX - 8, 1.25, tentZ + 6, { collide: true, sample: true });
  addAABBCollider(tentX - 8, 1.25, tentZ + 6, 4.8, 2.8, 4.8);
  // 곰인형 머리/귀
  addCyl(1.0, 1.4, bearMat, tentX - 8, 2.8, tentZ + 6, { collide: false, sample: true });
  // 토끼인형
  addCyl(0.8, 1.6, rabbitMat, tentX - 6.5, 2.8, tentZ + 5.5, { collide: false, sample: true });

  // 텐트 앞 낮은 독서 평상 벤치
  addBox(14, 2.2, 5.0, woodMat, -24, 1.1, -22);
  addAABBCollider(-24, 1.1, -22, 14.4, 2.4, 5.4);

  // ─────────────────────────────────────────────────────────────────
  // 5. 북동쪽: 대형 보드게임 진열장 & 장난감 수납 벽장 (리필존)
  // ─────────────────────────────────────────────────────────────────
  const shelfZ = -40;
  const shelfX = 32;

  // 메인 원목 보드게임 책장 (너비 28, 높이 15, 깊이 5)
  addBox(28, 15, 5.0, woodDarkMat, shelfX, 7.5, shelfZ);
  addAABBCollider(shelfX, 7.5, shelfZ, 28.5, 15.2, 5.4);

  // 책장 칸막이 선반 위에 놓인 알록달록 보드게임 박스들
  const gameColors = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0x8e24aa, 0xfb8c00];
  for (let i = 0; i < 10; i++) {
    const bx = shelfX - 11 + i * 2.4;
    const by = (i % 2 === 0) ? 5.2 : 9.5;
    const gMat = trackMat(lambert({ color: gameColors[i % gameColors.length] }));
    addBox(1.8, 3.2, 3.8, gMat, bx, by, shelfZ + 0.4, { collide: false, sample: true });
  }

  // 보드게임 진열장 앞 리필존 등록
  refillZones.push({
    x: shelfX,
    z: shelfZ + 4.5,
    r: 6.5,
    yMin: 0,
    yMax: 8,
    label: "보드게임장"
  });

  // 측면 낮은 완구 수납장 (플라스틱 서랍식 수납함)
  addBox(6.0, 5.5, 12.0, whiteMat, 52, 2.75, -26);
  addAABBCollider(52, 2.75, -26, 6.4, 5.8, 12.5);
  // 컬러 서랍 앞판 (스포이드 포인트)
  addBox(0.2, 2.2, 5.2, pastelPink, 48.9, 1.4, -28.5, { collide: false, sample: true });
  addBox(0.2, 2.2, 5.2, pastelBlue, 48.9, 3.9, -28.5, { collide: false, sample: true });
  addBox(0.2, 2.2, 5.2, pastelYellow, 48.9, 1.4, -23.5, { collide: false, sample: true });
  addBox(0.2, 2.2, 5.2, pastelGreen, 48.9, 3.9, -23.5, { collide: false, sample: true });

  // ─────────────────────────────────────────────────────────────────
  // 6. 남동쪽: 블록 놀이 & 미술 공작 활동 데스크
  // ─────────────────────────────────────────────────────────────────
  const craftDeskX = 38;
  const craftDeskZ = 34;

  addBox(16, 3.2, 8.0, woodMat, craftDeskX, 1.6, craftDeskZ);
  addAABBCollider(craftDeskX, 1.6, craftDeskZ, 16.4, 3.4, 8.4);
  // 데스크 상판 레고 녹색 베이스플레이트 판
  addBox(15, 0.15, 7.2, brightGreenMat(), craftDeskX, 3.25, craftDeskZ, { collide: false, sample: true });

  // 데스크 옆 조립 블록 타워 조형물 (아이들이 쌓아둔 장난감 성)
  addBox(2.4, 6.0, 2.4, brightYellow, craftDeskX + 6, 6.2, craftDeskZ, { collide: false, sample: true });
  addBox(2.0, 1.8, 2.0, brightRed, craftDeskX + 6, 9.8, craftDeskZ, { collide: false, sample: true });

  // ─────────────────────────────────────────────────────────────────
  // 7. 남서쪽: 돌봄교사 업무 데스크 및 간식대
  // ─────────────────────────────────────────────────────────────────
  const teacherDeskX = -44;
  const teacherDeskZ = 32;

  // 교사 업무 책상
  addBox(14, 3.4, 7.0, woodDarkMat, teacherDeskX, 1.7, teacherDeskZ);
  addAABBCollider(teacherDeskX, 1.7, teacherDeskZ, 14.4, 3.6, 7.4);
  // 노트북 & 업무 파일철
  addBox(3.4, 0.2, 2.6, silverMat, teacherDeskX - 2, 3.5, teacherDeskZ, { collide: false, sample: true });
  addBox(3.4, 2.4, 0.2, darkMetal, teacherDeskX - 2, 4.7, teacherDeskZ - 1.2, { collide: false, sample: true }); // 화면

  // 책상 의자
  addBox(3.2, 3.6, 3.2, darkMetal, teacherDeskX - 2, 1.8, teacherDeskZ + 5.5);
  addAABBCollider(teacherDeskX - 2, 1.8, teacherDeskZ + 5.5, 3.5, 3.8, 3.5);

  // 미니 싱크대 / 간식 준비대
  addBox(7.0, 4.2, 6.0, whiteMat, -53, 2.1, 16);
  addAABBCollider(-53, 2.1, 16, 7.4, 4.4, 6.4);
  addBox(2.8, 1.8, 2.2, silverMat, -53, 5.1, 16, { collide: false, sample: true }); // 미니 전자레인지

  // ─────────────────────────────────────────────────────────────────
  // 8. 바닥 장난감 기차 레일 선로 (Track Rail)
  // ─────────────────────────────────────────────────────────────────
  // 목재 침목 및 선로 레일 (시각적 선로 연출, 플레이어 이동에 방해되지 않도록 비충돌)
  const railMat = trackMat(lambert({ color: 0x90a4ae }));
  const sleeperMat = trackMat(lambert({ color: 0x6d4c41 }));
  const trackGroup = new THREE.Group();
  mapRoot.add(trackGroup);

  // 선로 둘레를 따라 침목 64개 절차적 배치
  const numSleepers = 64;
  for (let i = 0; i < numSleepers; i++) {
    const pt = getTrackPoint((i / numSleepers) * TRACK_TOTAL_LEN);
    const sl = addBox(0.8, 0.12, 4.6, sleeperMat, pt.x, 0.06, pt.z, { collide: false, sample: false, ry: pt.angle });
    trackGroup.add(sl);
  }

  // ─────────────────────────────────────────────────────────────────
  // 9. 움직이는 장난감 기차 (Moving Toy Train)
  //    - 기관차(빨강) + 탄수차(노랑) + 객차(파랑) 3량 편성
  //    - 프레임 기반 updateCareRoomGimmicks(ctx, dt)로 궤도를 순환
  // ─────────────────────────────────────────────────────────────────
  const trainGroup = new THREE.Group();
  mapRoot.add(trainGroup);
  careRoomGimmickState.trainGroup = trainGroup;
  careRoomGimmickState.wheels = [];

  // A. 기관차 (Locomotive - 선두 차량)
  const locoGroup = new THREE.Group();
  trainGroup.add(locoGroup);
  careRoomGimmickState.locomotive = locoGroup;

  // 메인 보일러 바디
  const locoBody = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.4, 1.8, 4.6)), brightRed);
  locoBody.position.set(0, 1.4, 0);
  locoGroup.add(locoBody);
  samplables.push(locoBody);

  // 운전실 캐빈 (후방)
  const locoCab = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.4, 2.6, 2.0)), trackMat(lambert({ color: 0xc62828 })));
  locoCab.position.set(0, 1.8, -1.3);
  locoGroup.add(locoCab);
  samplables.push(locoCab);

  // 굴뚝 (Smokestack - 전방)
  const chimney = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.35, 0.45, 1.4, 10)), darkMetal);
  chimney.position.set(0, 2.8, 1.5);
  locoGroup.add(chimney);

  // 전조등 (Headlight - 금색)
  const headlight = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 10)), trackMat(lambert({ color: 0xffeb3b, emissive: 0xf57f17 })));
  headlight.rotation.x = Math.PI / 2;
  headlight.position.set(0, 1.5, 2.4);
  locoGroup.add(headlight);

  // B. 탄수/화물차 (Tender - 중간 차량)
  const tenderGroup = new THREE.Group();
  trainGroup.add(tenderGroup);
  careRoomGimmickState.tender = tenderGroup;

  const tenderBody = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.4, 1.5, 3.8)), brightYellow);
  tenderBody.position.set(0, 1.25, 0);
  tenderGroup.add(tenderBody);
  samplables.push(tenderBody);

  // 화물차 속 작은 나무 블록 더미
  const cargoBlock = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.8, 0.8, 2.8)), woodDarkMat);
  cargoBlock.position.set(0, 2.1, 0);
  tenderGroup.add(cargoBlock);

  // C. 승객 객차 (Passenger Wagon - 후미 차량)
  const wagonGroup = new THREE.Group();
  trainGroup.add(wagonGroup);
  careRoomGimmickState.wagon = wagonGroup;

  const wagonBody = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.4, 1.9, 4.2)), brightBlue);
  wagonBody.position.set(0, 1.45, 0);
  wagonGroup.add(wagonBody);
  samplables.push(wagonBody);

  // 객차 화이트 지붕
  const wagonRoof = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.5, 0.35, 4.4)), whiteMat);
  wagonRoof.position.set(0, 2.5, 0);
  wagonGroup.add(wagonRoof);

  // 바퀴 헬퍼 함수
  const wheelGeom = trackGeom(new THREE.CylinderGeometry(0.5, 0.5, 0.25, 10));
  const addWheelsToCar = (carGroup, zOffsets) => {
    zOffsets.forEach(zo => {
      [-1.25, 1.25].forEach(xo => {
        const wh = new THREE.Mesh(wheelGeom, darkMetal);
        wh.rotation.z = Math.PI / 2;
        wh.position.set(xo, 0.5, zo);
        carGroup.add(wh);
        careRoomGimmickState.wheels.push(wh);
      });
    });
  };

  addWheelsToCar(locoGroup, [-1.4, 0.3, 1.5]);
  addWheelsToCar(tenderGroup, [-1.1, 1.1]);
  addWheelsToCar(wagonGroup, [-1.3, 1.3]);

  // 초기 기차 위치 설정 (거리 0 기준)
  updateTrainPositions(0);

  // ─────────────────────────────────────────────────────────────────
  // 10. 스폰 지점 (Spawns): 가구 충돌체 및 기차 선로 바깥 안전 바닥(y=0) 배치
  //     (※ 전수 검증: AABB 충돌체 겹침 0건 & 기차 주행 반경 3.0+ 안전 이격)
  // ─────────────────────────────────────────────────────────────────
  hiderSpawns.length = 0;
  const hiderCoords = [
    // 1~4. 북서쪽 텐트 및 독서 구역 주변 바닥 (Z <= -14)
    [-38, -16],   // 텐트 앞 개방 통로
    [-48, -14],   // 인형 바구니 옆
    [-24, -14],   // 독서 평상 앞 바닥
    [-14, -18],   // 평상 동측 바닥
    // 5~8. 북동쪽 보드게임장 및 수납장 주변 바닥 (Z <= -14)
    [20, -18],    // 보드게임장 서측 바닥
    [32, -18],    // 보드게임장 중앙 바닥
    [44, -18],    // 보드게임장 동측 바닥
    [48, -12],    // 수납장 앞 통로
    // 9~12. 동측 및 남동쪽 공작 데스크 주변 바닥
    [48, 4],      // 동측 벽면 통로
    [48, 18],     // 공작 데스크 북측 통로
    [24, 38],     // 공작 데스크 서측 바닥
    [38, 41],     // 공작 데스크 남측 바닥
    // 13~16. 서측 및 남서쪽 간식대/교사데스크 주변 바닥
    [-44, 4],     // 서측 벽면 통로
    [-44, 18],    // 간식대 앞 통로
    [-44, 24],    // 교사 데스크 북측 바닥
    [-28, 38],    // 교사 데스크 동측 통로
    // 17~20. 남측 및 중앙 코너 안전 통로 바닥 (기차 궤도 외곽)
    [0, 38],      // 남측 외곽 통로 중앙
    [-14, 38],    // 남서쪽 외곽 바닥
    [14, 38],     // 남동쪽 외곽 바닥
    [0, -14]      // 북측 외곽 통로 중앙
  ];
  hiderCoords.forEach(c => hiderSpawns.push(new THREE.Vector3(c[0], 0, c[1])));

  seekerSpawns.length = 0;
  const seekerCoords = [
    [-6, -10],
    [6, -10],
    [0, -8],
    [0, -12],
    [-4, -10],
    [4, -10]
  ];
  seekerCoords.forEach(c => seekerSpawns.push(new THREE.Vector3(c[0], 0, c[1])));
}

/**
 * 기차 3량의 위치 및 회전각 갱신 헬퍼
 * @param {number} baseDist - 기관차 기준 주행 거리
 */
function updateTrainPositions(baseDist) {
  const { locomotive, tender, wagon } = careRoomGimmickState;
  if (!locomotive || !tender || !wagon) return;

  // 1. 기관차
  const pLoco = getTrackPoint(baseDist);
  locomotive.position.set(pLoco.x, 0, pLoco.z);
  locomotive.rotation.y = pLoco.angle;

  // 2. 탄수/화물차 (기관차 뒤 5.4 유닛)
  const pTender = getTrackPoint(baseDist - 5.4);
  tender.position.set(pTender.x, 0, pTender.z);
  tender.rotation.y = pTender.angle;

  // 3. 승객 객차 (탄수차 뒤 5.2 유닛 = 기관차 뒤 10.6 유닛)
  const pWagon = getTrackPoint(baseDist - 10.6);
  wagon.position.set(pWagon.x, 0, pWagon.z);
  wagon.rotation.y = pWagon.angle;
}

/**
 * 돌봄교실 매 프레임 기믹 갱신 (프레임 기반 기차 순환 이동)
 * @param {Object} ctx - 엔진 컨텍스트
 * @param {number} dt - 프레임 경과 시간 (초)
 */
export function updateCareRoomGimmicks(ctx, dt) {
  if (!dt) return;
  careRoomGimmickState.animTime += dt;

  // 기차 순환 주행 계산
  const currentDist = careRoomGimmickState.animTime * TRAIN_TRACK.speed;
  updateTrainPositions(currentDist);

  // 바퀴 회전 애니메이션
  const wheelDelta = dt * TRAIN_TRACK.wheelSpeed;
  careRoomGimmickState.wheels.forEach(wh => {
    wh.rotation.x += wheelDelta;
  });

  // ※ [보류 기능] 기차 탑승 및 물리 연동:
  // - 플레이어가 기차 화물칸/객차 상단에 서서 함께 이동하는 기믹
  // - 필요 엔진 계약: 플레이어 메시의 동적 부모-자식 트랜스폼 연동 또는 상대 속도 동기화 계약 체결 전까지 보류
}

/**
 * 돌봄교실 리소스 및 기믹 정리 (맵 전환 시 필수 호출)
 * @param {Object} ctx - 엔진 컨텍스트
 */
export function cleanupCareRoom(ctx) {
  // 1. 전용 머티리얼 해제
  careRoomGimmickState.disposableMaterials.forEach(m => {
    if (m && typeof m.dispose === "function") {
      m.dispose();
    }
  });
  careRoomGimmickState.disposableMaterials = [];

  // 2. 전용 지오메트리 해제
  careRoomGimmickState.disposableGeometries.forEach(g => {
    if (g && typeof g.dispose === "function") {
      g.dispose();
    }
  });
  careRoomGimmickState.disposableGeometries = [];

  // 3. 기차 그룹 정리
  if (careRoomGimmickState.trainGroup && ctx && ctx.mapRoot) {
    ctx.mapRoot.remove(careRoomGimmickState.trainGroup);
  }
  careRoomGimmickState.trainGroup = null;
  careRoomGimmickState.locomotive = null;
  careRoomGimmickState.tender = null;
  careRoomGimmickState.wagon = null;
  careRoomGimmickState.wheels = [];
  careRoomGimmickState.animTime = 0;
}
