/**
 * 🩹 maps/health_office.js - 보건실 (Health Office)
 *
 * 《교실 대소동: 사라진 지우개 찾기》 독립 맵 모듈
 * - 의존성 주입(ctx) 패턴 준수
 * - setWallHeight(32) 계약 준수 (아늑하고 정온한 병원/보건실 층고)
 * - Zero-Asset 원칙: Three.js 절차적 지오메트리 & 2D Canvas 텍스처
 * - 표준 생명주기: HEALTH_OFFICE_MAP, buildHealthOffice, updateHealthOfficeGimmicks, cleanupHealthOffice
 * - 커튼 안전 설계: 무적 치즈 지점 및 완전 밀폐 공간 배제 (개방형 전면 동선 확보)
 * - 보류 기능: 안식처 버프(삑삑이 무음화)는 엔진 계약 확정 전까지 안전하게 보류
 */

export const HEALTH_OFFICE_MAP = {
  id: "health_office",
  name: "보건실",
  icon: "🩹"
};

// 기믹 상태 관리 (모듈 내부 격리)
let healthOfficeGimmickState = {
  disposableMaterials: [],
  animTime: 0,
  ledMaterial: null
};

/**
 * 보건실 3D 공간 생성
 * @param {Object} ctx - 엔진 주입 컨텍스트
 */
export function buildHealthOffice(ctx) {
  const {
    THREE, mapRoot, ROOM_W, ROOM_D,
    addBox, addCyl, canvasTex, lambert,
    addAABBCollider, samplables, colliders,
    refillZones, hiderSpawns, seekerSpawns,
    buildRoomShell, setWallHeight
  } = ctx;

  // 1. 벽 높이 설정: 보건실 표준 층고 (32 유닛)
  const WALL_H = 32;
  if (typeof setWallHeight === "function") {
    setWallHeight(WALL_H);
  }

  // 머티리얼 해제 추적 헬퍼
  const trackMat = (m) => {
    healthOfficeGimmickState.disposableMaterials.push(m);
    return m;
  };

  // 2. 바닥 텍스처 (연민트색 항균 비닐 장판 타일 & 십자 마크)
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    // 부드럽고 차분한 파스텔 연민트 베이스
    g.fillStyle = "#e2f2ee";
    g.fillRect(0, 0, w, h);

    // 4x4 타일 격자 라인
    g.strokeStyle = "#c5e4dc";
    g.lineWidth = 3;
    const step = w / 4; // 128px
    for (let x = 0; x <= w; x += step) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }

    // 타일 내 은은한 마블/스펙클 질감 디테일
    g.fillStyle = "rgba(168, 214, 202, 0.28)";
    for (let i = 0; i < 60; i++) {
      const rx = (i * 73) % w;
      const ry = (i * 97) % h;
      g.fillRect(rx, ry, 6, 4);
    }

    // 은은한 보건실 십자 심볼 패턴 (각 타일 중앙)
    g.fillStyle = "rgba(79, 175, 153, 0.12)";
    for (let cx = step / 2; cx < w; cx += step) {
      for (let cy = step / 2; cy < h; cy += step) {
        g.fillRect(cx - 10, cy - 3, 20, 6);
        g.fillRect(cx - 3, cy - 10, 6, 20);
      }
    }
  }, 4, 3);

  // 룸 쉘 생성 (바닥, 벽: 부드러운 오프화이트, 천장: 소프트 화이트, 걸레받이: 차분한 민트그레이)
  buildRoomShell(lambert({ map: floorTex }), 0xf4f7f6, 0xfafbfc, 0x6e8f88);

  // ─────────────────────────────────────────────────────────────────
  // 공통 머티리얼 정의
  // ─────────────────────────────────────────────────────────────────
  const whiteMat = trackMat(lambert({ color: 0xfafafa }));
  const sheetMat = trackMat(lambert({ color: 0xffffff }));
  const bedMetalMat = trackMat(lambert({ color: 0xdde5e8 }));
  const woodDeskMat = trackMat(lambert({ color: 0xd8bf97 }));
  const woodLegMat = trackMat(lambert({ color: 0x8d6e63 }));
  const darkMetalMat = trackMat(lambert({ color: 0x455a64 }));
  const silverMat = trackMat(lambert({ color: 0xcfd8dc }));
  const glassMat = trackMat(lambert({ color: 0xb2ebf2, transparent: true, opacity: 0.62 }));
  const curtainMat = trackMat(lambert({ color: 0xe8f5e9, transparent: true, opacity: 0.88 }));
  const redCrossMat = trackMat(lambert({ color: 0xe53935 }));
  const blueMat = trackMat(lambert({ color: 0x1e88e5 }));
  const amberBottleMat = trackMat(lambert({ color: 0xb87333 }));
  const softSofaMat = trackMat(lambert({ color: 0x80cbc4 }));

  // ─────────────────────────────────────────────────────────────────
  // 3. 북서쪽: 환자용 침대 3조 & 개방형 주름 커튼
  //    (커튼 뒤 무적·밀폐 배제: 전면이 완전 개방되어 검거 통로 확보)
  // ─────────────────────────────────────────────────────────────────
  const bedZ = -27;
  const bedW = 10;
  const bedD = 22;
  const bedH = 3.2;

  const bedCentersX = [-44, -28, -12];

  bedCentersX.forEach((bx, idx) => {
    // A. 침대 스틸 프레임 (다리 4개)
    const legY = 1.0;
    const legH = 2.0;
    const offX = bedW / 2 - 0.7;
    const offZ = bedD / 2 - 0.7;
    addBox(0.8, legH, 0.8, bedMetalMat, bx - offX, legY, bedZ - offZ, { collide: false, sample: false });
    addBox(0.8, legH, 0.8, bedMetalMat, bx + offX, legY, bedZ - offZ, { collide: false, sample: false });
    addBox(0.8, legH, 0.8, bedMetalMat, bx - offX, legY, bedZ + offZ, { collide: false, sample: false });
    addBox(0.8, legH, 0.8, bedMetalMat, bx + offX, legY, bedZ + offZ, { collide: false, sample: false });

    // B. 매트리스 본체 (하얀 시트)
    addBox(bedW, 1.4, bedD, whiteMat, bx, 2.2, bedZ, { collide: true, sample: true });
    // C. 푹신한 침대 상단 시트 주름 커버
    addBox(bedW - 0.4, 0.6, bedD - 0.4, sheetMat, bx, 3.1, bedZ, { collide: true, sample: true });

    // D. 베개 (머리맡: Z = bedZ - 8.5)
    addBox(6.4, 0.8, 3.8, sheetMat, bx, 3.7, bedZ - 8.5, { collide: true, sample: true });

    // E. 얇은 이불 (접힌 형태, Z = bedZ + 3.0)
    const blanketMat = trackMat(lambert({ color: idx === 1 ? 0xc8e6c9 : 0xb3e5fc }));
    addBox(bedW - 0.6, 0.45, 12, blanketMat, bx, 3.5, bedZ + 3.5, { collide: false, sample: true });

    // F. 침대 전체 단일 AABB 충돌체 (플레이어가 침대 위에 올라갈 수 있고 내부에 끼이지 않음)
    addAABBCollider(bx, 1.9, bedZ, bedW + 0.4, 3.8, bedD + 0.4);

    // G. 협탁 (Bedside Table - 머리맡 옆)
    const tableX = bx - 6.2;
    addBox(3.4, 3.2, 3.4, woodDeskMat, tableX, 1.6, bedZ - 9);
    addAABBCollider(tableX, 1.6, bedZ - 9, 3.6, 3.4, 3.6);

    // 협탁 위 소품 (체온계 케이스 & 알약통)
    addBox(1.2, 0.4, 2.2, whiteMat, tableX, 3.4, bedZ - 9, { collide: false, sample: true });
    addCyl(0.4, 1.2, amberBottleMat, tableX + 0.8, 3.8, bedZ - 8.8, { collide: false, sample: true });
  });

  // 링거 거치대 (IV Pole Stand - 침대 1과 침대 2 옆)
  [-36, -20].forEach(ivX => {
    addCyl(1.5, 0.3, darkMetalMat, ivX, 0.15, bedZ - 10, { collide: false, sample: true }); // 바닥 발
    addCyl(0.2, 13, silverMat, ivX, 6.6, bedZ - 10, { collide: true, sample: false }); // 기둥
    addAABBCollider(ivX, 6.6, bedZ - 10, 1.6, 13.2, 1.6);
    // 링거 수액 팩 (반투명 백)
    addBox(1.4, 2.4, 0.6, glassMat, ivX + 0.8, 12.2, bedZ - 10, { collide: false, sample: true });
  });

  // 커튼 레일 및 주름 커튼 패널
  // ※ [안전 설계]: 전면(Z > -16)은 완전히 뚫려 있어 술래가 침대 사이와 앞쪽으로 막힘없이 진입 가능
  // ※ 커튼 패널은 collide: false로 설정하여 조준선(Raycast)을 차단하지 않아 뒤에 숨은 지우개를 즉시 검거 가능
  const curtainRailY = 22;
  [-52, -36, -20, -4].forEach(rx => {
    // 천장 레일 기둥
    addBox(0.4, 0.3, 24, silverMat, rx, curtainRailY, bedZ - 2, { collide: false, sample: false });
    // 반쯤 쳐진 주름 커튼 패널 (길이 14)
    addBox(0.45, 17, 14, curtainMat, rx, curtainRailY - 8.8, bedZ - 6, { collide: false, sample: true });
  });

  // ─────────────────────────────────────────────────────────────────
  // 4. 북동쪽: 보건교사 진료 및 상담 데스크 구역
  // ─────────────────────────────────────────────────────────────────
  const deskX = 32;
  const deskZ = -28;

  // L자형 상담 책상 본체
  addBox(18, 3.4, 8, woodDeskMat, deskX, 1.7, deskZ);
  addBox(18.4, 0.5, 8.4, whiteMat, deskX, 3.65, deskZ); // 깔끔한 상판
  addAABBCollider(deskX, 1.9, deskZ, 18.6, 4.0, 8.6);

  // 책상 측면 서랍장 (L자 연결)
  addBox(6, 3.2, 7, woodDeskMat, deskX + 9, 1.6, deskZ + 4.5);
  addAABBCollider(deskX + 9, 1.6, deskZ + 4.5, 6.2, 3.4, 7.2);

  // 책상 위 데스크톱 모니터 & 키보드 & 진료 차트
  addBox(5.6, 3.6, 0.6, darkMetalMat, deskX, 5.8, deskZ - 1.2, { collide: false, sample: true });
  addBox(1.2, 1.8, 1.2, silverMat, deskX, 4.5, deskZ - 1.2, { collide: false, sample: false }); // 모니터 받침
  addBox(4.2, 0.2, 1.8, darkMetalMat, deskX, 4.0, deskZ + 1.2, { collide: false, sample: true }); // 키보드
  addBox(2.2, 0.15, 3.2, trackMat(lambert({ color: 0x8d6e63 })), deskX - 5.5, 4.0, deskZ, { collide: false, sample: true }); // 차트 클립보드

  // 보건교사 회전 의자 (책상 뒤편: Z = deskZ - 6.5)
  addBox(3.8, 4.2, 3.8, darkMetalMat, deskX, 2.1, deskZ - 6.5);
  addAABBCollider(deskX, 2.1, deskZ - 6.5, 4.0, 4.4, 4.0);

  // 학생 상담용 원형 스툴 2개 (책상 앞: Z = deskZ + 7.5)
  [-4, 4].forEach(sOff => {
    const sx = deskX + sOff;
    const sz = deskZ + 7.5;
    addCyl(1.6, 2.8, trackMat(lambert({ color: 0x00897b })), sx, 1.4, sz, { collide: true, sample: true });
  });

  // ─────────────────────────────────────────────────────────────────
  // 5. 동쪽 벽 (+X): 대형 의약품 캐비닛 & 구급약 보관함 (리필존)
  // ─────────────────────────────────────────────────────────────────
  const cabX = 53;

  // 약품 보관 캐비닛 1 (북쪽)
  addBox(6.5, 16, 15, whiteMat, cabX, 8.0, -8);
  addBox(5.8, 14.5, 14, glassMat, cabX - 0.4, 8.0, -8, { collide: false, sample: true }); // 유리 도어
  addAABBCollider(cabX, 8.0, -8, 7.0, 16.2, 15.5);

  // 약품 보관 캐비닛 2 (남쪽)
  addBox(6.5, 16, 15, whiteMat, cabX, 8.0, 18);
  addBox(5.8, 14.5, 14, glassMat, cabX - 0.4, 8.0, 18, { collide: false, sample: true }); // 유리 도어
  addAABBCollider(cabX, 8.0, 18, 7.0, 16.2, 15.5);

  // 캐비닛 사이 선반 테이블 & 구급약 보관함 (리필존)
  const refTableZ = 5;
  addBox(5.8, 4.0, 7.5, silverMat, cabX - 0.3, 2.0, refTableZ);
  addAABBCollider(cabX - 0.3, 2.0, refTableZ, 6.2, 4.2, 8.0);

  // 빨간 십자가 구급약 상자 (First Aid Kit)
  const kitX = cabX - 1.2;
  const kitZ = refTableZ;
  addBox(3.4, 2.2, 4.6, whiteMat, kitX, 5.1, kitZ, { collide: true, sample: true });
  // 십자가 빨간 마크
  addBox(0.1, 1.4, 0.45, redCrossMat, kitX - 1.72, 5.1, kitZ, { collide: false, sample: true });
  addBox(0.1, 0.45, 1.4, redCrossMat, kitX - 1.72, 5.1, kitZ, { collide: false, sample: true });
  addAABBCollider(kitX, 5.1, kitZ, 3.6, 2.4, 4.8);

  // 구급약 상자 주변 붕대 롤 & 거즈 팩 소품
  addCyl(0.65, 0.8, whiteMat, kitX + 0.8, 4.4, kitZ - 2.2, { collide: false, sample: true, rx: Math.PI / 2 });
  addBox(1.4, 0.8, 1.4, whiteMat, kitX + 0.8, 4.4, kitZ + 2.2, { collide: false, sample: true });

  // 공식 리필존 등록
  refillZones.push({
    x: kitX,
    z: kitZ,
    r: 6.5,
    yMin: 0,
    yMax: 10,
    label: "구급약 보관함"
  });

  // ─────────────────────────────────────────────────────────────────
  // 6. 남동쪽 (+X, +Z): 신체검사 및 측정 구역
  // ─────────────────────────────────────────────────────────────────
  // A. 신장/체중 측정기 (자동 키/몸무게 측정 기기)
  const scaleX = 44;
  const scaleZ = 36;
  addBox(4.5, 0.4, 4.5, silverMat, scaleX, 0.2, scaleZ); // 발판 베이스
  addBox(1.2, 15, 1.4, whiteMat, scaleX, 7.8, scaleZ - 1.4); // 수직 측정 기둥
  addBox(3.2, 0.8, 4.0, darkMetalMat, scaleX, 15.2, scaleZ, { collide: false, sample: true }); // 머리 측정 터치바
  // 디지털 측정 표시 LCD 패널
  const ledMat = trackMat(lambert({ color: 0x00e676, emissive: 0x00703c }));
  healthOfficeGimmickState.ledMaterial = ledMat;
  addBox(1.8, 1.2, 0.25, ledMat, scaleX, 9.5, scaleZ - 0.6, { collide: false, sample: true });
  addAABBCollider(scaleX, 7.8, scaleZ, 4.8, 15.8, 4.8);

  // B. 혈압 측정 데스크 및 의자
  const bpX = 24;
  const bpZ = 36;
  addBox(10, 3.4, 6, whiteMat, bpX, 1.7, bpZ);
  addAABBCollider(bpX, 1.7, bpZ, 10.4, 3.6, 6.4);
  // 혈압계 본체 및 팔 투입 원통
  addBox(3.6, 2.4, 3.2, whiteMat, bpX, 4.6, bpZ, { collide: false, sample: true });
  addCyl(1.0, 2.6, blueMat, bpX, 4.6, bpZ, { collide: false, sample: true, rx: Math.PI / 2 });
  // 혈압 측정 의자
  addBox(3.4, 3.2, 3.4, darkMetalMat, bpX - 5.5, 1.6, bpZ);
  addAABBCollider(bpX - 5.5, 1.6, bpZ, 3.6, 3.4, 3.6);

  // C. 전면 벽 시력검사표 차트 (South Wall 부착: Z = +ROOM_D/2 - 0.5 = 44.5)
  const eyeChartTex = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);

    // 상단 타이틀
    g.fillStyle = "#d32f2f";
    g.fillRect(w / 2 - 12, 16, 24, 6);
    g.fillRect(w / 2 - 3, 7, 6, 24);

    g.fillStyle = "#1b5e20";
    g.font = "bold 20px sans-serif";
    g.textAlign = "center";
    g.fillText("시 력 검 사 표", w / 2, 54);

    // 구분선
    g.strokeStyle = "#455a64";
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(20, 64); g.lineTo(w - 20, 64); g.stroke();

    // 란돌트 고리(Landolt C) 및 시력 수치 절차적 렌더링
    const lines = [
      { v: "0.1", r: 24, lw: 8, gap: 0 },
      { v: "0.3", r: 18, lw: 6, gap: Math.PI / 2 },
      { v: "0.5", r: 14, lw: 5, gap: Math.PI },
      { v: "0.8", r: 11, lw: 4, gap: -Math.PI / 2 },
      { v: "1.0", r: 8, lw: 3, gap: 0 },
      { v: "1.5", r: 6, lw: 2.5, gap: Math.PI / 2 },
      { v: "2.0", r: 4.5, lw: 2, gap: Math.PI }
    ];

    let curY = 100;
    lines.forEach(item => {
      g.fillStyle = "#263238";
      g.font = "bold 15px monospace";
      g.textAlign = "left";
      g.fillText(item.v, 24, curY + item.r / 2);

      // C자 링 그리기
      g.strokeStyle = "#1a1a1a";
      g.lineWidth = item.lw;
      g.beginPath();
      const startA = item.gap + 0.55;
      const endA = item.gap + Math.PI * 2 - 0.55;
      g.arc(w / 2 + 10, curY, item.r, startA, endA);
      g.stroke();

      curY += item.r * 2 + 18;
    });
  }, 1, 1);

  const eyeChartMat = trackMat(lambert({ map: eyeChartTex }));
  const chartX = 35;
  const chartZ = ROOM_D / 2 - 0.4;
  addBox(8.0, 14.0, 0.4, eyeChartMat, chartX, 15.0, chartZ, { collide: true, sample: true });
  addAABBCollider(chartX, 15.0, chartZ, 8.4, 14.4, 1.2);

  // 시력검사 지시봉 스탠드
  addCyl(1.0, 0.4, darkMetalMat, chartX - 7, 0.2, chartZ - 2.5, { collide: false, sample: true });
  addCyl(0.15, 8.0, woodLegMat, chartX - 7, 4.2, chartZ - 2.5, { collide: false, sample: true });

  // ─────────────────────────────────────────────────────────────────
  // 7. 남서쪽 (-X, +Z): 세면대, 위생 수납장 및 대기 소파 구역
  // ─────────────────────────────────────────────────────────────────
  // A. 위생 세면대 (Washing Basin)
  const sinkX = -52;
  const sinkZ = 32;
  addBox(8.0, 4.4, 6.0, whiteMat, sinkX, 2.2, sinkZ);
  // 세면대 수전(수도꼭지)
  addCyl(0.3, 1.6, silverMat, sinkX, 5.0, sinkZ - 1.8, { collide: false, sample: true });
  addBox(0.8, 0.3, 1.2, silverMat, sinkX, 5.8, sinkZ - 1.2, { collide: false, sample: false });
  // 손소독제 펌프병 (스포이드 위장용)
  addCyl(0.45, 1.2, blueMat, sinkX + 2.4, 5.0, sinkZ + 1.2, { collide: false, sample: true });
  // 세면대 상단 거울
  addBox(7.2, 8.0, 0.3, glassMat, sinkX, 10.5, sinkZ - 0.5, { collide: false, sample: true });
  addAABBCollider(sinkX, 2.2, sinkZ, 8.4, 4.6, 6.4);

  // 세면대 옆 페달식 의료 폐기물통
  addBox(3.0, 3.4, 3.0, whiteMat, sinkX, 1.7, sinkZ + 7);
  addAABBCollider(sinkX, 1.7, sinkZ + 7, 3.2, 3.6, 3.2);

  // B. 대기용 안락 소파 (Waiting Sofa)
  const sofaX = -32;
  const sofaZ = 35;
  // 좌판 시트
  addBox(18.0, 2.4, 6.5, softSofaMat, sofaX, 1.8, sofaZ, { collide: true, sample: true });
  // 등받이
  addBox(18.0, 4.2, 2.2, softSofaMat, sofaX, 4.2, sofaZ + 2.4, { collide: true, sample: true });
  // 좌우 팔걸이
  addBox(2.2, 3.4, 6.5, trackMat(lambert({ color: 0x4db6ac })), sofaX - 8.2, 2.8, sofaZ, { collide: true, sample: true });
  addBox(2.2, 3.4, 6.5, trackMat(lambert({ color: 0x4db6ac })), sofaX + 8.2, 2.8, sofaZ, { collide: true, sample: true });
  addAABBCollider(sofaX, 2.5, sofaZ + 0.6, 18.8, 5.2, 7.8);

  // C. 이동식 병풍 파티션 스크린 (Mobile Privacy Screen)
  const partX = -14;
  const partZ = 30;
  addBox(12.0, 8.5, 0.8, trackMat(lambert({ color: 0xe0f2f1 })), partX, 5.2, partZ, { collide: true, sample: true });
  addBox(12.4, 0.4, 1.2, silverMat, partX, 9.6, partZ, { collide: false, sample: false }); // 상단 프레임
  addBox(12.4, 0.4, 1.2, silverMat, partX, 0.8, partZ, { collide: false, sample: false }); // 하단 프레임
  // 바닥 롤러 바퀴 다리
  addBox(0.6, 1.4, 4.0, darkMetalMat, partX - 5.5, 0.7, partZ, { collide: false, sample: false });
  addBox(0.6, 1.4, 4.0, darkMetalMat, partX + 5.5, 0.7, partZ, { collide: false, sample: false });
  addAABBCollider(partX, 5.0, partZ, 12.8, 9.2, 2.2);

  // ─────────────────────────────────────────────────────────────────
  // 8. 스폰 지점 (Spawns): 충돌체 바깥 안전 바닥(y=0) 배치 (전수 검증 완료)
  // ─────────────────────────────────────────────────────────────────
  hiderSpawns.length = 0;
  const hiderCoords = [
    // 1~3. 침대 앞 개방 통로 바닥 (커튼 입구 전면)
    [-44, -10],
    [-28, -10],
    [-12, -10],
    // 4~6. 침대 사이 개방 이동 통로
    [-36, -8],
    [-20, -8],
    [-4, -10],
    // 7~9. 진료 데스크 주변 바닥
    [16, -26],
    [32, -14],
    [46, -14],
    // 10~12. 의약품 캐비닛 및 리필존 주변 바닥
    [38, 2],
    [38, 14],
    [46, 2],
    // 13~15. 신체검사 및 시력검사표 측정 구역 바닥
    [35, 26],
    [22, 24],
    [46, 25],
    // 16~17. 세면대 및 위생 구역 바닥
    [-44, 24],
    [-44, 34],
    // 18~19. 대기 소파 및 파티션 주변 바닥
    [-24, 22],
    [-14, 18],
    // 20. 중앙 홀 통로 바닥
    [0, 20]
  ];
  hiderCoords.forEach(c => hiderSpawns.push(new THREE.Vector3(c[0], 0, c[1])));

  seekerSpawns.length = 0;
  const seekerCoords = [
    [-6, 4],
    [6, 4],
    [0, 0],
    [0, 8],
    [-4, 6],
    [4, 6]
  ];
  seekerCoords.forEach(c => seekerSpawns.push(new THREE.Vector3(c[0], 0, c[1])));
}

/**
 * 보건실 매 프레임 기믹 갱신
 * @param {Object} ctx - 엔진 컨텍스트
 * @param {number} dt - 프레임 경과 시간 (초)
 */
export function updateHealthOfficeGimmicks(ctx, dt) {
  if (!dt) return;
  healthOfficeGimmickState.animTime += dt;

  // 신장체중계 디지털 패널 시각 펄스 효과 (0.3 ~ 0.8 부드러운 발광)
  if (healthOfficeGimmickState.ledMaterial) {
    const pulse = (Math.sin(healthOfficeGimmickState.animTime * 2.5) + 1) * 0.5;
    healthOfficeGimmickState.ledMaterial.emissiveIntensity = 0.3 + pulse * 0.45;
  }

  // ※ [보류 기능] 안식처(Sanctuary) 버프:
  // - 침대 위 및 커튼 내부 영역에 머무를 시 30초 주기 자동 삑삑이(Whistle) 1회 무음화
  // - 필요 엔진 계약: 플레이어 위치 추적 및 타이머 우회 이벤트 API, 버프 상태 동기화 계약 체결 전까지 보류
}

/**
 * 보건실 리소스 및 기믹 정리 (맵 전환 시 필수 호출)
 * @param {Object} ctx - 엔진 컨텍스트
 */
export function cleanupHealthOffice(ctx) {
  healthOfficeGimmickState.disposableMaterials.forEach(m => {
    if (m && typeof m.dispose === "function") {
      m.dispose();
    }
  });
  healthOfficeGimmickState.disposableMaterials = [];
  healthOfficeGimmickState.ledMaterial = null;
  healthOfficeGimmickState.animTime = 0;
}
