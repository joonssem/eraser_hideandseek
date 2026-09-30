/**
 * 📚 maps/library_elem.js - 초등 도서실 (Elementary Library)
 *
 * 《교실 대소동: 사라진 지우개 찾기》 독립 맵 모듈
 * - 의존성 주입(ctx) 패턴 준수
 * - setWallHeight(28) 계약 준수 (엔진 공통 규격 ROOM_W=120, ROOM_D=90)
 * - Zero-Asset 원칙: Three.js 절차적 지오메트리 & 2D Canvas 텍스처
 * - 표준 생명주기: LIBRARY_ELEM_MAP, buildLibraryElem, updateLibraryElemGimmicks, cleanupLibraryElem
 *
 * [주요 구역 및 오브젝트]
 * 1. 5단 동화책 서가 5개동 + 좌우 벽면 5단 서가
 *    - 다채로운 색상(빨강, 주황, 노랑, 청록, 보라 등)의 책등(Book Spines)
 *    - 실제 진입 및 세로 은신 가능한 빈 책 슬롯(Empty Slots) 10개소 (장식/통짜 AABB 봉쇄 없음)
 * 2. 세 가지 다채로운 열람 구역
 *    - 온돌 좌식 존: 높이 0.5 units 원목 마루, 낮은 둥근 탁자 2개, 파스텔 방석 8개
 *    - 일반 열람석 4세트: 목재 테이블 4개, 의자 16개, 테이블 하부 진입 공간 개방
 *    - 창가 카운터 바: 긴 카운터 테이블(높이 3.2), 하이체어 5개, 통로 이동 동선 확보
 * 3. 스마트 무인 대출·반납기 키오스크 정확히 2대 (입구 배치)
 *    - 민트(#48cae4) & 화이트 투톤, 터치스크린, 발광 레드 스캐너 라인, 영수증 출력구, 도서 반납구
 * 4. 행사 안내 벽보 3종, 창가 책상 필기도구, 사서 데스크와 리필존
 * 5. 지우개 스폰 20개 / 술래 스폰 6개 (전부 y=0 바닥 및 AABB 겹침 0건 보장)
 */

export const LIBRARY_ELEM_MAP = {
  id: "library_elem",
  name: "초등 도서실",
  icon: "📚"
};

// 기믹 및 리소스 상태 관리 (모듈 내부 격리)
let libraryGimmickState = {
  disposableMaterials: [],
  disposableGeometries: [],
  disposableTextures: [],
  animTime: 0,
  scannerLines: [],
  emptySlots: []
};

/**
 * 초등 도서실 3D 공간 생성
 * @param {Object} ctx - 엔진 주입 컨텍스트
 */
export function buildLibraryElem(ctx) {
  const {
    THREE, mapRoot, ROOM_W, ROOM_D,
    addBox, addCyl, canvasTex, lambert,
    addAABBCollider, samplables, colliders,
    refillZones, hiderSpawns, seekerSpawns,
    buildRoomShell, setWallHeight
  } = ctx;

  // 1. 벽 높이 설정 계약 (28 유닛)
  const WALL_H = 28;
  if (typeof setWallHeight === "function") {
    setWallHeight(WALL_H);
  }

  // 리소스 추적 헬퍼
  const trackMat = (mat) => {
    libraryGimmickState.disposableMaterials.push(mat);
    return mat;
  };
  const trackGeom = (geom) => {
    libraryGimmickState.disposableGeometries.push(geom);
    return geom;
  };
  const trackTex = (tex) => {
    libraryGimmickState.disposableTextures.push(tex);
    return tex;
  };

  libraryGimmickState.scannerLines = [];
  libraryGimmickState.emptySlots = [];

  // ─────────────────────────────────────────────────────────────────
  // 2. 머티리얼 및 텍스처 정의 (Zero-Asset 팔레트)
  // ─────────────────────────────────────────────────────────────────
  // 바닥 원목 헤링본/마루 텍스처 (따뜻한 라이트 우드 톤)
  const floorTex = trackTex(canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#dfc8a5";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(165, 135, 100, 0.4)";
    g.lineWidth = 2;
    // 마루 널빤지 패턴
    for (let x = 0; x <= w; x += 32) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
    }
    for (let y = 0; y <= h; y += 64) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }
    g.fillStyle = "rgba(255, 255, 255, 0.15)";
    g.fillRect(4, 4, 24, 56);
    g.fillRect(36, 68, 24, 56);
  }, 4, 3));

  // 온돌 마루 텍스처 (밝고 포근한 자작나무 원목)
  const ondolTex = trackTex(canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#faedcd";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(212, 163, 115, 0.45)";
    g.lineWidth = 2;
    for (let y = 0; y <= h; y += 32) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }
  }, 2, 2));

  // 키오스크 터치스크린 텍스처 (도서 검색 및 대출 UI)
  const kioskScreenTex = trackTex(canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = "#e0f2fe";
    g.fillRect(0, 0, w, h);
    // 상단 타이틀 바
    g.fillStyle = "#0284c7";
    g.fillRect(0, 0, w, 24);
    g.fillStyle = "#ffffff";
    g.font = "bold 10px sans-serif";
    g.fillText("📚 스마트 대출·반납", 10, 16);
    // 검색창 & 버튼
    g.fillStyle = "#ffffff";
    g.fillRect(10, 34, w - 20, 18);
    g.strokeStyle = "#38bdf8";
    g.strokeRect(10, 34, w - 20, 18);
    // 대출/반납 큰 버튼 2개
    g.fillStyle = "#48cae4";
    g.fillRect(14, 62, 45, 45);
    g.fillStyle = "#38b000";
    g.fillRect(69, 62, 45, 45);
  }));

  const libraryPosters = [
    { title: "이 달의 책 소개", subtitle: "상상력을 키우는\n이야기 속으로!", color: "#ffb703", accent: "#fb5607" },
    { title: "도서관 행사", subtitle: "독서 여권 만들기\n책 한 권, 도장 하나!", color: "#90e0ef", accent: "#0077b6" },
    { title: "함께 만드는 시", subtitle: "시를 이용한\n책갈피 만들기", color: "#ffc8dd", accent: "#c9184a" }
  ].map(({ title, subtitle, color, accent }) => {
    const tex = trackTex(canvasTex(256, 320, (g, w, h) => {
      g.fillStyle = "#fffaf0"; g.fillRect(0, 0, w, h);
      g.fillStyle = color; g.fillRect(10, 10, w - 20, h - 20);
      g.fillStyle = accent; g.fillRect(20, 24, w - 40, 66);
      g.fillStyle = "#ffffff"; g.font = "bold 22px sans-serif"; g.textAlign = "center";
      g.fillText(title, w / 2, 66);
      g.fillStyle = "#263238"; g.font = "bold 18px sans-serif";
      subtitle.split("\n").forEach((line, i) => g.fillText(line, w / 2, 142 + i * 30));
      g.fillStyle = accent; g.beginPath(); g.arc(w / 2, 240, 28, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#ffffff"; g.font = "bold 18px sans-serif"; g.fillText("📚", w / 2, 247);
      g.textAlign = "start";
    }));
    return trackMat(lambert({ map: tex }));
  });

  const floorMat = trackMat(lambert({ map: floorTex }));
  const ondolMat = trackMat(lambert({ map: ondolTex }));
  const shelfWoodMat = trackMat(lambert({ color: 0xc68b59 }));      // 서가 따뜻한 원목
  const shelfBackMat = trackMat(lambert({ color: 0x9c6644 }));      // 서가 후면판
  const tableWoodMat = trackMat(lambert({ color: 0xd4a373 }));      // 테이블 상판 원목
  const tableLegMat = trackMat(lambert({ color: 0x8d6e63 }));       // 테이블/의자 원목 다리
  const chairMat = trackMat(lambert({ color: 0xbb8558 }));          // 열람석 의자
  const counterBarMat = trackMat(lambert({ color: 0xb07d52 }));     // 창가 카운터 바
  const highStoolMat = trackMat(lambert({ color: 0xd97706 }));      // 높은 의자 시트
  const stoolMetalMat = trackMat(lambert({ color: 0x4b5563 }));     // 하이체어 스틸 다리
  const deskMat = trackMat(lambert({ color: 0x6f4e37 }));           // 사서 데스크
  const kioskMintMat = trackMat(lambert({ color: 0x48cae4 }));      // 키오스크 민트
  const kioskWhiteMat = trackMat(lambert({ color: 0xf8f9fa }));     // 키오스크 화이트
  const kioskDarkMat = trackMat(lambert({ color: 0x1e293b }));      // 키오스크 슬롯/내부
  const kioskScreenMat = trackMat(lambert({ map: kioskScreenTex }));// 키오스크 터치스크린
  const scannerLaserMat = trackMat(lambert({ color: 0xff1e42, emissive: 0xff0033, emissiveIntensity: 0.8 })); // 빨간 레이저 빔

  // 책등 전용 다채로운 동화책 컬러 팔레트 (빨강, 노랑, 주황, 청록, 보라, 파랑, 연두, 핑크)
  const bookColors = [
    0xe63946, 0xf4a261, 0xe9c46a, 0x2a9d8f,
    0x7209b7, 0x4361ee, 0x588157, 0xe76f51
  ];
  const bookMats = bookColors.map(c => trackMat(lambert({ color: c })));

  // 온돌 쿠션 파스텔 컬러 팔레트
  const cushionColors = [0xf4a261, 0x2a9d8f, 0xe9c46a, 0xb5838d];
  const cushionMats = cushionColors.map(c => trackMat(lambert({ color: c })));

  // 3. 룸 쉘 생성 (따뜻한 크림빛 벽면 & 원목 바닥 & 몰딩)
  buildRoomShell(floorMat, 0xf7ede2, 0xfffdfa, 0x8b5a2b);

  // ─────────────────────────────────────────────────────────────────
  // 4. 입구 구역: 스마트 무인 대출·반납기 2대 & 사서 데스크
  // ─────────────────────────────────────────────────────────────────
  // 무인 대출·반납기 키오스크 정확히 2대 (X: -6.0, +6.0, Z: -38.0)
  const kioskXPositions = [-6.0, 6.0];
  kioskXPositions.forEach(kx => {
    const kz = -38.0;
    // A. 하부 민트 수납함 본체 (너비 2.8, 높이 2.2, 깊이 2.4, y=1.1)
    addBox(2.8, 2.2, 2.4, kioskMintMat, kx, 1.1, kz, { collide: false, sample: true });
    // B. 상부 화이트 하우징 (너비 2.6, 높이 1.8, 깊이 2.2, y=3.0)
    addBox(2.6, 1.8, 2.2, kioskWhiteMat, kx, 3.0, kz, { collide: false, sample: true });
    // C. 30도 기울어진 터치스크린 모니터 (너비 2.2, 높이 1.4, 깊이 0.15, y=3.25, z=kz+1.0)
    const scr = addBox(2.2, 1.4, 0.15, kioskScreenMat, kx, 3.25, kz + 1.0, { collide: false, sample: true, rx: -Math.PI / 8 });
    // D. 바코드 스캐너 홈 및 빨간 발광 레이저 빔 라인 (y=2.15, z=kz+0.95)
    addBox(2.0, 0.25, 0.5, kioskDarkMat, kx, 2.15, kz + 0.95, { collide: false, sample: true });
    const laser = addBox(1.6, 0.05, 0.05, scannerLaserMat, kx, 2.18, kz + 0.95, { collide: false, sample: false });
    libraryGimmickState.scannerLines.push(laser);
    // E. 영수증 출력구 틈새 (너비 0.9, 높이 0.08, 깊이 0.1, y=2.65, z=kz+1.12)
    addBox(0.9, 0.08, 0.1, kioskDarkMat, kx, 2.65, kz + 1.12, { collide: false, sample: true });
    // F. 도서 반납 투입구 (너비 1.6, 높이 0.35, 깊이 0.2, y=1.45, z=kz+1.22)
    addBox(1.6, 0.35, 0.2, kioskDarkMat, kx, 1.45, kz + 1.22, { collide: false, sample: true });
    // 키오스크 전용 통짜 정밀 충돌체 (너비 2.8, 높이 4.0, 깊이 2.4, y=2.0)
    addAABBCollider(kx, 2.0, kz, 2.8, 4.0, 2.4);
  });

  // 사서 데스크 (Librarian Desk) - X: -26.0, Z: -36.0 (너비 12.0, 높이 2.6, 깊이 3.2)
  addBox(12.0, 2.6, 3.2, deskMat, -26.0, 1.3, -36.0, { collide: false, sample: true });
  addAABBCollider(-26.0, 1.3, -36.0, 12.0, 2.6, 3.2);

  // 사서 PC & 도서 검색 모니터
  addBox(3.4, 2.2, 0.2, kioskDarkMat, -24.0, 3.7, -36.5, { collide: false, sample: true });
  addBox(2.8, 0.1, 1.2, kioskDarkMat, -24.0, 2.66, -35.2, { collide: false, sample: true });

  // 도서 반납 북카트 (X: -34.0, Z: -36.0)
  addBox(3.0, 2.0, 2.4, kioskMintMat, -34.0, 1.0, -36.0, { collide: false, sample: true });
  addAABBCollider(-34.0, 1.0, -36.0, 3.0, 2.0, 2.4);

  // 리필존 1개소 등록: "사서데스크"
  refillZones.push({ x: -26.0, z: -36.0, r: 6.0, label: "사서데스크" });

  // 서쪽 벽면 행사 게시판: 세 가지 독서 활동을 학생 눈높이에 표시
  [-29.0, -17.0, -5.0].forEach((z, i) => {
    addBox(0.18, 5.2, 8.0, libraryPosters[i], -59.85, 8.0, z, { collide: false, sample: true });
  });

  // ─────────────────────────────────────────────────────────────────
  // 5. 중앙 5단 동화책 서가 + 좌우 벽면 서가
  // ─────────────────────────────────────────────────────────────────
  // 중앙 서가: 기존 위치와 바닥·2단 접근 슬롯은 유지하고 전체 높이를 11.5로 확장
  // - 5개 선반 층에 책을 배치하고, 좌우 벽면에도 깊이 3.2의 5단 서가 추가
  // - 후면 차폐판은 뒤편 z-1.45에 배치하여 전면 빈 슬롯 진입 통로 완벽 개방
  // - 1층과 2층에 지우개가 쏙 들어가는 빈 슬롯(Empty Slot) 확보
  const bookshelfPositions = [
    { x: -42.0, z: -12.0, name: "서가_1" },
    { x: -22.0, z: -12.0, name: "서가_2" },
    { x: -42.0, z: 8.0, name: "서가_3" },
    { x: -22.0, z: 8.0, name: "서가_4" },
    { x: -32.0, z: 26.0, name: "서가_5" }
  ];

  bookshelfPositions.forEach((pos, sIdx) => {
    const bx = pos.x;
    const bz = pos.z;
    const shelfH = 11.5;
    const shelfW = 15.0;
    const shelfD = 3.2;

    // A. 수직 프레임 (좌 기둥, 중앙 칸막이, 우 기둥)
    addBox(0.3, shelfH, shelfD, shelfWoodMat, bx - 7.35, shelfH / 2, bz, { collide: false, sample: true });
    addBox(0.3, shelfH, shelfD, shelfWoodMat, bx, shelfH / 2, bz, { collide: false, sample: true });
    addBox(0.3, shelfH, shelfD, shelfWoodMat, bx + 7.35, shelfH / 2, bz, { collide: false, sample: true });
    // 개별 프레임 충돌체 부여 (전체 통짜 AABB 금지)
    addAABBCollider(bx - 7.35, shelfH / 2, bz, 0.3, shelfH, shelfD);
    addAABBCollider(bx, shelfH / 2, bz, 0.3, shelfH, shelfD);
    addAABBCollider(bx + 7.35, shelfH / 2, bz, 0.3, shelfH, shelfD);

    // B. 5단 수평 선반 (높이 약 2.3 간격)
    const shelfLevels = [0.15, 2.45, 4.75, 7.05, 9.35, 11.2];
    shelfLevels.forEach((y, level) => {
      addBox(shelfW, 0.25, shelfD, shelfWoodMat, bx, y, bz, { collide: false, sample: true });
      if (level === shelfLevels.length - 1) addAABBCollider(bx, y, bz, shelfW, 0.25, shelfD);
    });

    // C. 서가 후면판 (z = bz - 1.45)
    addBox(shelfW, shelfH, 0.2, shelfBackMat, bx, shelfH / 2, bz - 1.45, { collide: false, sample: true });
    addAABBCollider(bx, shelfH / 2, bz - 1.45, shelfW, shelfH, 0.2);

    // D. 동화책 책등 및 실제 접근 가능한 빈 슬롯(Empty Slot) 생성
    // 좌측 베이: X from bx-7.2 to bx-0.15 (너비 ~7.0)
    // 우측 베이: X from bx+0.15 to bx+7.2 (너비 ~7.0)
    // [하단 베이(1층, y=0.28)]: 좌측 베이에 빈 슬롯 1개소 (폭 2.6 units, 높이 1.2 units)
    // [상단 베이(2층, y=1.63)]: 우측 베이에 빈 슬롯 1개소 (폭 2.6 units, 높이 1.2 units)

    // 1층 좌측: 책들(bx-7.0 ~ bx-3.2) + 빈 슬롯(bx-3.2 ~ bx-0.6, 폭 2.6)
    const slotLower = {
      id: `${pos.name}_하단슬롯`,
      cx: bx - 1.9, cy: 0.85, cz: bz + 0.1,
      w: 2.6, h: 1.2, d: 2.6
    };
    libraryGimmickState.emptySlots.push(slotLower);

    // 1층 좌측 채운 책들
    let curX = bx - 7.0;
    while (curX < bx - 3.4) {
      const bookW = 0.35 + ((curX * 3.7) % 0.35 + 0.35); // 0.35~0.7
      const bookH = 1.0 + ((curX * 2.3) % 0.2 + 0.1);    // 1.0~1.3
      const bookD = 1.4 + ((curX * 1.9) % 0.4);          // 1.4~1.8
      const mat = bookMats[Math.floor(Math.abs(curX * 13) % bookMats.length)];
      addBox(bookW, bookH, bookD, mat, curX + bookW / 2, 0.28 + bookH / 2, bz - 0.5, { collide: false, sample: true });
      curX += bookW + 0.05;
    }

    // 1층 우측: 전체 책 배치 (bx+0.3 ~ bx+7.0)
    curX = bx + 0.3;
    while (curX < bx + 7.0) {
      const bookW = 0.35 + ((curX * 4.1) % 0.3 + 0.3);
      const bookH = 0.95 + ((curX * 3.1) % 0.25);
      const bookD = 1.5;
      const mat = bookMats[Math.floor(Math.abs(curX * 11) % bookMats.length)];
      addBox(bookW, bookH, bookD, mat, curX + bookW / 2, 0.28 + bookH / 2, bz - 0.5, { collide: false, sample: true });
      curX += bookW + 0.05;
    }

    // 2층 우측: 빈 슬롯 1개소 (bx+0.6 ~ bx+3.2, 폭 2.6) + 책들(bx+3.4 ~ bx+7.0)
    const slotUpper = {
      id: `${pos.name}_상단슬롯`,
      cx: bx + 1.9, cy: 2.2, cz: bz + 0.1,
      w: 2.6, h: 1.2, d: 2.6
    };
    libraryGimmickState.emptySlots.push(slotUpper);

    // 2층 우측 채운 책들
    curX = bx + 3.4;
    while (curX < bx + 7.0) {
      const bookW = 0.35 + ((curX * 2.9) % 0.35 + 0.3);
      const bookH = 0.9 + ((curX * 5.3) % 0.25);
      const bookD = 1.45;
      const mat = bookMats[Math.floor(Math.abs(curX * 7) % bookMats.length)];
      addBox(bookW, bookH, bookD, mat, curX + bookW / 2, 1.63 + bookH / 2, bz - 0.5, { collide: false, sample: true });
      curX += bookW + 0.05;
    }

    // 2층 좌측: 전체 책 배치 (bx-7.0 ~ bx-0.3)
    curX = bx - 7.0;
    while (curX < bx - 0.3) {
      const bookW = 0.4 + ((curX * 3.3) % 0.3);
      const bookH = 0.95 + ((curX * 4.7) % 0.25);
      const bookD = 1.4;
      const mat = bookMats[Math.floor(Math.abs(curX * 9) % bookMats.length)];
      addBox(bookW, bookH, bookD, mat, curX + bookW / 2, 1.63 + bookH / 2, bz - 0.5, { collide: false, sample: true });
      curX += bookW + 0.05;
    }

    // 3~5층: 각 베이의 남은 공간을 동화책으로 채워 서가가 풍성해 보이도록 구성
    [4.75, 7.05, 9.35].forEach((shelfY, tierIndex) => {
      [-1, 1].forEach((side) => {
        let x = bx + (side < 0 ? -7.0 : 0.3);
        const endX = bx + (side < 0 ? -0.3 : 7.0);
        while (x < endX) {
          const bookW = 0.38 + (Math.abs(x * (tierIndex + 3)) % 0.28);
          const bookH = 1.25 + (Math.abs(x * (tierIndex + 5)) % 0.38);
          const mat = bookMats[Math.floor(Math.abs(x * (tierIndex + 11)) % bookMats.length)];
          addBox(bookW, bookH, 1.5, mat, x + bookW / 2, shelfY + 0.15 + bookH / 2, bz - 0.5, { collide: false, sample: true });
          x += bookW + 0.06;
        }
      });
    });
  });

  // 벽 쪽 5단 서가: 양쪽 긴 벽을 따라 배치해 책 수납량을 늘린다.
  // 외벽과 간격을 두고, 양 끝 출입 동선을 비워 둔다.
  [-56.0, 56.0].forEach((wallX, wallIndex) => {
    const wallShelfW = 28.0;
    const wallShelfD = 3.0;
    const wallShelfH = 11.5;
    const centerZ = 4.0;
    const frontX = wallX + (wallIndex === 0 ? 1.6 : -1.6);
    addBox(0.25, wallShelfH, wallShelfD, shelfWoodMat, frontX, wallShelfH / 2, centerZ, { collide: false, sample: true });
    addBox(0.2, wallShelfH, wallShelfD, shelfBackMat, wallX, wallShelfH / 2, centerZ, { collide: false, sample: true });
    addAABBCollider(frontX, wallShelfH / 2, centerZ, 0.25, wallShelfH, wallShelfD);
    addAABBCollider(wallX, wallShelfH / 2, centerZ, 0.2, wallShelfH, wallShelfD);
    [0.15, 2.45, 4.75, 7.05, 9.35, 11.2].forEach((y) => {
      addBox(wallShelfD, 0.25, wallShelfW, shelfWoodMat, wallX + (wallIndex === 0 ? 1.6 : -1.6), y, centerZ, { collide: false, sample: true });
    });
    for (let tier = 0; tier < 5; tier++) {
      let z = centerZ - wallShelfW / 2 + 0.3;
      while (z < centerZ + wallShelfW / 2 - 0.3) {
        const bookW = 0.38 + (Math.abs(z * (tier + 3 + wallIndex)) % 0.28);
        const bookH = 1.25 + (Math.abs(z * (tier + 5)) % 0.38);
        const mat = bookMats[Math.floor(Math.abs(z * (tier + 13)) % bookMats.length)];
        addBox(1.5, bookH, bookW, mat, wallX + (wallIndex === 0 ? 1.6 : -1.6), [0.85, 3.15, 5.45, 7.75, 10.05][tier], z + bookW / 2, { collide: false, sample: true });
        z += bookW + 0.06;
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // 6. 구역 1: 온돌 좌식 존 (Ondol Seating Zone)
  // ─────────────────────────────────────────────────────────────────
  // 원목 마루 단상: 높이 0.5 units (너비 32.0, 높이 0.5, 깊이 26.0, 중심: 36.0, 0.25, -25.0)
  addBox(32.0, 0.5, 26.0, ondolMat, 36.0, 0.25, -25.0, { collide: false, sample: true });
  addAABBCollider(36.0, 0.25, -25.0, 32.0, 0.5, 26.0);

  // 낮은 둥근 탁자 2개 (상판 반경 2.6, 두께 0.25, y=1.2, 낮은 다리 4개)
  const ondolTables = [
    { x: 28.0, z: -20.0 },
    { x: 44.0, z: -28.0 }
  ];
  ondolTables.forEach(ot => {
    // 둥근 상판
    addCyl(2.6, 0.25, tableWoodMat, ot.x, 1.2, ot.z, { collide: false, sample: true });
    addAABBCollider(ot.x, 1.2, ot.z, 5.2, 0.25, 5.2);
    // 낮은 다리 4개
    const rLeg = 1.6;
    [[-rLeg, -rLeg], [rLeg, -rLeg], [-rLeg, rLeg], [rLeg, rLeg]].forEach(([lx, lz]) => {
      addCyl(0.18, 0.65, tableLegMat, ot.x + lx, 0.85, ot.z + lz, { collide: false, sample: false });
    });
  });

  // 다채로운 파스텔 쿠션/방석 8개 (너비 1.8, 두께 0.16, 깊이 1.8, y=0.58)
  const cushionPositions = [
    { x: 23.5, z: -20.0, cIdx: 0 },
    { x: 32.5, z: -20.0, cIdx: 1 },
    { x: 28.0, z: -24.5, cIdx: 2 },
    { x: 28.0, z: -15.5, cIdx: 3 },
    { x: 39.5, z: -28.0, cIdx: 2 },
    { x: 48.5, z: -28.0, cIdx: 3 },
    { x: 44.0, z: -32.5, cIdx: 0 },
    { x: 44.0, z: -23.5, cIdx: 1 }
  ];
  cushionPositions.forEach(cp => {
    addBox(1.8, 0.16, 1.8, cushionMats[cp.cIdx], cp.x, 0.58, cp.z, { collide: false, sample: true });
  });

  // 온돌 존 가장자리 미니 그림책 진열대 (X: 23.0, Z: -36.0)
  addBox(5.0, 1.6, 1.2, shelfWoodMat, 23.0, 0.8, -36.0, { collide: false, sample: true });
  addAABBCollider(23.0, 0.8, -36.0, 5.0, 1.6, 1.2);

  // ─────────────────────────────────────────────────────────────────
  // 7. 구역 2: 일반 열람석 4세트 (목재 테이블 4개 & 의자 16개)
  // ─────────────────────────────────────────────────────────────────
  // 테이블 상판 높이 y=2.5, 하부 다리 분리 충돌체로 밑면 진입 공간 완벽 개방
  const readingTableSets = [
    { x: -4.0, z: 8.0, name: "열람석_1" },
    { x: 14.0, z: 8.0, name: "열람석_2" },
    { x: -4.0, z: 26.0, name: "열람석_3" },
    { x: 14.0, z: 26.0, name: "열람석_4" }
  ];

  readingTableSets.forEach(rt => {
    const tx = rt.x;
    const tz = rt.z;
    // A. 목재 테이블 상판 (너비 9.6, 두께 0.35, 깊이 4.8, y=2.5)
    addBox(9.6, 0.35, 4.8, tableWoodMat, tx, 2.5, tz, { collide: false, sample: true });
    addAABBCollider(tx, 2.5, tz, 9.6, 0.35, 4.8);

    // B. 네 귀퉁이 원목 다리 4개 (테이블 아래 높이 2.3 units 뚫려 있어 통과/은신 가능)
    const legOx = 4.4;
    const legOz = 2.1;
    [[-legOx, -legOz], [legOx, -legOz], [-legOx, legOz], [legOx, legOz]].forEach(([lx, lz]) => {
      addBox(0.4, 2.3, 0.4, tableLegMat, tx + lx, 1.15, tz + lz, { collide: false, sample: true });
      addAABBCollider(tx + lx, 1.15, tz + lz, 0.4, 2.3, 0.4);
    });

    // C. 목재 의자 4개 (북쪽 2개 z=tz-3.4, 남쪽 2개 z=tz+3.4)
    [-2.4, 2.4].forEach(cx => {
      // 북쪽 의자 (남향)
      addBox(1.8, 0.2, 1.8, chairMat, tx + cx, 1.2, tz - 3.4, { collide: false, sample: true });
      addBox(1.8, 1.2, 0.2, chairMat, tx + cx, 1.9, tz - 4.2, { collide: false, sample: true });
      addAABBCollider(tx + cx, 1.3, tz - 3.4, 1.8, 1.4, 1.8);

      // 남쪽 의자 (북향)
      addBox(1.8, 0.2, 1.8, chairMat, tx + cx, 1.2, tz + 3.4, { collide: false, sample: true });
      addBox(1.8, 1.2, 0.2, chairMat, tx + cx, 1.9, tz + 4.2, { collide: false, sample: true });
      addAABBCollider(tx + cx, 1.3, tz + 3.4, 1.8, 1.4, 1.8);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 8. 구역 3: 창가 카운터 바 & 하이체어 (남쪽 벽면 배치)
  // ─────────────────────────────────────────────────────────────────
  // 카운터 바 테이블 (너비 28.0, 높이 3.2, 깊이 2.4, 중심: 38.0, 3.1, 40.0)
  addBox(28.0, 0.35, 2.4, counterBarMat, 38.0, 3.1, 40.0, { collide: false, sample: true });
  addAABBCollider(38.0, 3.1, 40.0, 28.0, 0.35, 2.4);

  // 카운터 지지 기둥 패널 (좌/우 및 중간 지지대)
  addBox(0.4, 2.9, 2.4, counterBarMat, 24.2, 1.45, 40.0, { collide: false, sample: true });
  addBox(0.4, 2.9, 2.4, counterBarMat, 51.8, 1.45, 40.0, { collide: false, sample: true });
  addAABBCollider(24.2, 1.45, 40.0, 0.4, 2.9, 2.4);
  addAABBCollider(51.8, 1.45, 40.0, 0.4, 2.9, 2.4);

  // 하이체어 5개 (높은 다리 의자, 시트 높이 y=2.0, z=36.5)
  const stoolXs = [28.0, 33.0, 38.0, 43.0, 48.0];
  stoolXs.forEach(sx => {
    // 원형 시트
    addCyl(0.85, 0.18, highStoolMat, sx, 2.0, 36.5, { collide: false, sample: true });
    // 발걸이 링 & 스틸 다리 4개
    addCyl(0.7, 0.08, stoolMetalMat, sx, 0.85, 36.5, { collide: false, sample: false });
    addCyl(0.12, 1.9, stoolMetalMat, sx - 0.45, 0.95, 36.5 - 0.45, { collide: false, sample: false });
    addCyl(0.12, 1.9, stoolMetalMat, sx + 0.45, 0.95, 36.5 - 0.45, { collide: false, sample: false });
    addCyl(0.12, 1.9, stoolMetalMat, sx - 0.45, 0.95, 36.5 + 0.45, { collide: false, sample: false });
    addCyl(0.12, 1.9, stoolMetalMat, sx + 0.45, 0.95, 36.5 + 0.45, { collide: false, sample: false });
    addAABBCollider(sx, 1.0, 36.5, 1.6, 2.0, 1.6);
  });

  // 창가 카운터 위 학생용 필기도구: 색연필·마카·형광펜을 색상별 컵에 꽂아 둔다.
  const stationeryColors = [0xef476f, 0xff9f1c, 0xffd166, 0x06d6a0, 0x118ab2, 0x7b2cbf, 0xf72585, 0x4361ee];
  [30.0, 38.0, 46.0].forEach((sx, holderIndex) => {
    const sz = 39.7;
    addCyl(0.48, 0.75, kioskMintMat, sx, 3.65, sz, { collide: false, sample: true });
    for (let p = 0; p < 8; p++) {
      const angle = (Math.PI * 2 * p) / 8;
      const px = sx + Math.cos(angle) * 0.27;
      const pz = sz + Math.sin(angle) * 0.27;
      const colorMat = trackMat(lambert({ color: stationeryColors[(p + holderIndex * 2) % stationeryColors.length] }));
      addCyl(p % 3 === 0 ? 0.085 : 0.055, p % 3 === 0 ? 1.25 : 1.05, colorMat, px, 4.35, pz, { collide: false, sample: true });
      if (p % 3 === 0) {
        addCyl(0.09, 0.16, colorMat, px, 4.99, pz, { collide: false, sample: true });
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // 9. 스폰 지점 등록 (지우개 20개, 술래 6개 - y=0 바닥 및 AABB 겹침 0건 전수 검증)
  // ─────────────────────────────────────────────────────────────────
  const rawHiders = [
    // 서가 구역 빈 슬롯 주변 및 통로 (8개소)
    [-42.0, -6.5],   // 서가 1 남측 통로 (하단 빈 슬롯 바로 앞)
    [-22.0, -6.5],   // 서가 2 남측 통로
    [-42.0, 13.5],   // 서가 3 남측 통로
    [-22.0, 13.5],   // 서가 4 남측 통로
    [-32.0, -18.0],  // 서가 1&2 북측 통로
    [-32.0, -1.0],   // 서가 1·2와 3·4 사이 중앙 통로
    [-32.0, 17.5],   // 서가 3&4 남측 통로
    [-32.0, 32.5],   // 서가 5 남측 통로
    // 서측 외곽 통로 (2개소)
    [-54.0, -12.0],
    [-54.0, 12.0],
    // 온돌 좌식 존 마루 인접 바닥 (4개소)
    [17.5, -25.0],   // 온돌 서측 바닥
    [54.5, -25.0],   // 온돌 동측 바닥
    [36.0, -8.0],    // 온돌 남측 통로 바닥
    [36.0, -40.5],   // 온돌 북측 외곽 바닥
    // 일반 열람석 사이 통로 (2개소)
    [-4.0, 17.0],    // 열람석 1과 3 사이 통로
    [14.0, 17.0],    // 열람석 2와 4 사이 통로
    // 창가 카운터 바 주변 (2개소)
    [38.0, 31.0],    // 하이체어 앞 통로
    [54.0, 36.0],    // 카운터 동측 코너
    // 입구 및 사서 데스크 주변 (2개소)
    [-14.0, -36.0],  // 키오스크와 사서데스크 사이
    [-38.0, -36.0]   // 사서데스크 서측 코너
  ];

  const rawSeekers = [
    [0.0, -32.0],    // 입구 중앙 통로 (키오스크 정면)
    [0.0, -10.0],    // 서가-온돌 연결 중앙 교차로 북측
    [0.0, 12.0],     // 서가-열람석 연결 중앙 교차로 남측
    [0.0, 36.0],     // 남측 카운터 바 복도 중앙
    [-54.0, -28.0],  // 서측 서가 진입로 코너
    [54.0, 0.0]      // 동측 열람 구역 외곽 복도
  ];

  rawHiders.forEach(([x, z]) => hiderSpawns.push(new THREE.Vector3(x, 0, z)));
  rawSeekers.forEach(([x, z]) => seekerSpawns.push(new THREE.Vector3(x, 0, z)));
}

/**
 * 초등 도서실 매 프레임 기믹 갱신
 * @param {Object} ctx - 엔진 컨텍스트
 * @param {number} dt - 경과 시간 (초)
 */
export function updateLibraryElemGimmicks(ctx, dt) {
  if (!dt) return;
  libraryGimmickState.animTime += dt;

  // 무인 키오스크 스캐너 레이저 빔 미세 펄스 (안전한 정현파 발광)
  const pulse = Math.sin(libraryGimmickState.animTime * 4.0) * 0.2 + 0.8;
  libraryGimmickState.scannerLines.forEach(line => {
    if (line && line.material && line.material.emissiveIntensity !== undefined) {
      line.material.emissiveIntensity = pulse;
    }
  });
}

/**
 * 초등 도서실 리소스 및 기믹 정리 (맵 전환 시 필수 호출)
 * @param {Object} ctx - 엔진 컨텍스트
 */
export function cleanupLibraryElem(ctx) {
  // 1. 등록된 전용 머티리얼 중복 없는 안전 dispose
  const disposedMats = new Set();
  libraryGimmickState.disposableMaterials.forEach(m => {
    if (m && typeof m.dispose === "function" && !disposedMats.has(m)) {
      disposedMats.add(m);
      m.dispose();
    }
  });
  libraryGimmickState.disposableMaterials = [];

  // 2. 등록된 전용 지오메트리 중복 없는 안전 dispose
  const disposedGeoms = new Set();
  libraryGimmickState.disposableGeometries.forEach(g => {
    if (g && typeof g.dispose === "function" && !disposedGeoms.has(g)) {
      disposedGeoms.add(g);
      g.dispose();
    }
  });
  libraryGimmickState.disposableGeometries = [];

  // 3. 등록된 전용 Canvas 텍스처 중복 없는 안전 dispose
  const disposedTexs = new Set();
  libraryGimmickState.disposableTextures.forEach(t => {
    if (t && typeof t.dispose === "function" && !disposedTexs.has(t)) {
      disposedTexs.add(t);
      t.dispose();
    }
  });
  libraryGimmickState.disposableTextures = [];

  // 4. 내부 상태 초기화
  libraryGimmickState.scannerLines = [];
  libraryGimmickState.emptySlots = [];
  libraryGimmickState.animTime = 0;
}
