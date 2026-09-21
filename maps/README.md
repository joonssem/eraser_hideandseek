# 🗺️ 맵 모듈 코딩 규칙 및 가이드 (maps/README.md)

이 디렉토리는 《교실 대소동: 사라진 지우개 찾기》의 **독립 맵 모듈**을 보관하는 공간입니다.  
배포 파일인 `index.html`을 직접 수정하지 않고, 각 맵을 독립된 ES 모듈 파일로 개발·검증하기 위해 아래 표준 규격을 반드시 준수합니다.

---

## 1. 맵 모듈 필수 인터페이스 (4대 요소)

모든 맵 파일(`[map_id].js`)은 반드시 다음 4개 항목을 `export`해야 합니다:

```javascript
// 1. 맵 메타데이터 객체
export const ART_ROOM_MAP = {
  id: "art_room",
  name: "미술실",
  icon: "🎨"
};

// 2. 맵 3D 빌드 함수 (의존성 주입형 ctx)
export function buildArtRoom(ctx) {
  const {
    THREE, mapRoot, ROOM_W, ROOM_D, WALL_H,
    addBox, addCyl, canvasTex, lambert,
    addAABBCollider, samplables, colliders,
    refillZones, hiderSpawns, seekerSpawns,
    buildRoomShell, setWallHeight
  } = ctx;
  
  // 벽 높이 변경 시 반드시 setWallHeight 계약 함수 호출 (WALL_H 직접 수정 금지)
  if (typeof setWallHeight === "function") {
    setWallHeight(34);
  }
  // ... 맵 생성 로직
}

// 3. 기믹 매 프레임 갱신 함수 (필요 시 동작, 없으면 noop)
export function updateArtRoomGimmicks(ctx, dt) {
  // 기믹 상태 및 물리/이펙트 갱신
}

// 4. 맵 전환/종료 시 리소스 정리 함수 (필수)
export function cleanupArtRoom(ctx) {
  // 타이머, 사운드, 기믹 전용 동적 3D 메쉬 정리
}
```

---

## 2. 공통 필수 규칙 (AI 및 작업자 필독)

1. **의존성 주입(`ctx`) 및 계약 준수**:
   - `index.html`의 전역/지역 변수에 직접 접근하지 말고, 반드시 `ctx`로 전달된 함수와 배열만 사용합니다.
   - 벽 높이 설정은 컨텍스트 프로퍼티를 직접 수정하지 않고, **`setWallHeight(height)` 계약 함수**를 호출합니다.
2. **공간 규격**:
   - 가로 `ROOM_W = 120`, 세로 `ROOM_D = 90`, 기본 벽 높이 `WALL_H`.
3. **스폰 지점 규격**:
   - **지우개 스폰 (`hiderSpawns`)**: 최소 16개 이상 (미술실: 20개). 반드시 `new THREE.Vector3(x, 0, z)` 인스턴스 배열로 구성.
   - **술래 스폰 (`seekerSpawns`)**: 최소 6개 이상. 반드시 `new THREE.Vector3(x, 0, z)` 인스턴스로 `seekerSpawns.push(...)`.
   - 모든 스폰 지점은 충돌체(`colliders`) 내부나 벽면 밖이 아닌 빈 공간 바닥(`y = 0`)에 배치.
4. **물리 충돌체 vs 위장 스포이드 분리 원칙**:
   - **올라타거나 통과하지 못하는 가구(테이블, 책장 등)**: `collide: true` 또는 통짜 `addAABBCollider` 적용.
   - **올라탈 수 있는 계단/선반(예: 12단 건조대)**: 전체를 통째로 막는 단일 AABB를 두지 않고, 프레임 기둥 및 선반별 개별 충돌체를 적용하여 계단식 파쿠르 이동 보장.
   - **작은 소품(물감 덩어리, 크레파스, 약병 등)**: 술래의 조준점(Raycast)을 가로막아 무적 버그가 생기지 않도록 `{ collide: false, sample: true }` 설정.
   - **가구 내부 치즈 방지**: 지우개가 가구 내부 빈틈으로 파고들어 무적이 되지 않도록 가구 몸체에 충돌체 반드시 부여.
5. **기믹 상태 관리 및 보류 기능 구분**:
   - 구현되지 않은 기능(예: 플레이어 위치 추적 기반 발자국)을 완료로 기재하지 않습니다.
   - 플레이어 위치/이동 상태 계약이 필요한 기믹은 명확히 `[보류 기능]`으로 분류합니다.
6. **Zero-Asset 원칙**:
   - 외부 이미지, 3D GLB 모델, 외부 오디오 파일 다운로드 일체 금지.
   - 순수 Three.js 기본 지오메트리(`BoxGeometry`, `CylinderGeometry` 등)와 `canvasTex()`를 이용한 절차적 2D Canvas 텍스처로만 구성.
7. **최상위 부작용(Top-level Side Effects) 금지**:
   - 모듈을 `import`하는 것만으로 DOM 조작, 캔버스 생성, 타이머 실행 등이 발생하지 않아야 합니다. 모든 작업은 `build[Map](ctx)` 실행 시점에만 시작됩니다.
8. **`cleanup` 무결성**:
   - 맵이 바뀔 때 이전 맵의 기믹용 3D 오브젝트나 `setInterval/setTimeout`이 남아 메모리 누수나 사운드 오류가 발생하지 않도록 `cleanup` 함수에서 완벽히 해제합니다.

---

## 3. 독립 프리뷰 실행 방법 (`maps/preview.html`)

배포본 `index.html`에 영향을 주지 않고, 제작한 신규 맵 모듈의 3D 렌더링, 스폰 마커, 충돌체, 스포이드 대상을 독립적으로 시각 검증할 수 있습니다.

### 실행 절차
1. 프로젝트 루트(`eraser_hideandseek/`)에서 로컬 HTTP 서버 실행:
   ```bash
   python -m http.server 8000
   # 또는
   npx serve .
   ```
2. 웹 브라우저에서 프리뷰 페이지 접속:
   ```text
   http://localhost:8000/maps/preview.html
   ```

### 주요 검증 기능
* **HUD 대시보드**: 벽 높이(`WALL_H`), 요정 스폰(20개), 술래 스폰(6개), 충돌체(AABB) 수, 스포이드 대상 수 실시간 모니터링
* **시각화 토글**: 요정 스폰 마커(초록 핀), 술래 스폰 마커(빨강 핀), 충돌체 와이어프레임 박스 온/오프
* **카메라 프리셋**: 기본 쿼터 뷰, 상공 부감 뷰(Top-down), 전면 뷰 원클릭 전환
* **재빌드 & 클린업 테스트**: `[🔄 맵 클린업 & 재빌드 테스트]` 버튼으로 `cleanup` 후 재빌드 시 객체 중복 및 메모리 누수 발생 여부 즉시 검증
