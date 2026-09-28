# 🗺️ 신규 맵 3종 정식 통합 제안서 및 롤백 계획

- **문서 번호**: `docs/18_followup_maps_integration_proposal.md`
- **작성일**: 2026-09-28
- **작성자**: AGY
- **검토 담당**: Codex / 사용자
- **대상 모듈**: 시청각실 (`av_room.js`), 컴퓨터실 (`computer_lab.js`), 초등 도서실 (`library_elem.js`)
- **기준 브랜치 / HEAD**: `main` / `51424ea`
- **상위 체크리스트**: `docs/12_agy_train_fix_and_new_spaces_checklist.md` (5단계)
- **적용 상태**: **제안 단계 (사용자 및 Codex 명시적 승인 전 실제 index.html 수정 금지)**

---

## 1. 현재 상태 분석

### 1.1 배포 게임 맵 vs 프리뷰 전용 맵 현황
현재 《교실 대소동: 사라진 지우개 찾기》 저장소의 맵 등록 현황은 다음과 같이 분리되어 있습니다:

| 구분 | 맵 ID | 맵 이름 | 유형 | 구현 위치 | 현재 등록 위치 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **정식 배포** | `classroom` | 교실 | `canvas` (인라인) | `index.html:1508` | `index.html`, `preview.html` |
| **정식 배포** | `science` | 과학실 | `canvas` (인라인) | `index.html:1644` | `index.html`, `preview.html` |
| **정식 배포** | `cafeteria` | 급식실 | `canvas` (인라인) | `index.html:1839` | `index.html`, `preview.html` |
| **정식 배포** | `library` | 도서관 | `canvas` (인라인) | `index.html:2009` | `index.html`, `preview.html` |
| **정식 배포** | `art_room` | 미술실 | `module` | `maps/art_room.js` | `index.html`, `preview.html` |
| **정식 배포** | `gymnasium` | 체육관 | `module` | `maps/gymnasium.js` | `index.html`, `preview.html` |
| **정식 배포** | `music_room` | 음악실 | `module` | `maps/music_room.js` | `index.html`, `preview.html` |
| **정식 배포** | `health_office` | 보건실 | `module` | `maps/health_office.js` | `index.html`, `preview.html` |
| **정식 배포** | `care_room` | 돌봄교실 | `module` | `maps/care_room.js` | `index.html`, `preview.html` |
| **정식 배포** | `av_room` | 시청각실 | `module` | `maps/av_room.js` | `index.html`, `preview.html` |
| **정식 배포** | `computer_lab` | 컴퓨터실 | `module` | `maps/computer_lab.js` | `index.html`, `preview.html` |
| **정식 배포** | `library_elem` | 초등 도서실 | `module` | `maps/library_elem.js` | `index.html`, `preview.html` |

### 1.2 신규 맵 3종의 검증 완료 상태
신규 맵 3종은 모듈화 및 생명주기 계약을 충족하며 Codex의 독립 검증을 통과했습니다:
1. **시청각실 (`av_room`)**: 2단계 Codex PASS (23건 자동 검사 전수 통과)
2. **컴퓨터실 (`computer_lab`)**: 3단계 Codex PASS (32건 자동 검사 전수 통과, 24석 및 4행 z=26 보존 검증 완료)
3. **초등 도서실 (`library_elem`)**: 4단계 Codex PASS (49건 자동 검사 전수 통과, CanvasTexture 3종 수명주기 해제 검증 완료)
4. **일괄 검사 스크립트 (`scripts/check_followup_maps.mjs`)**: 29건 전수 통과 (8대 하위 검사 프로세스 0 에러)

---

## 2. 실제 `index.html` 통합 지점 분석

`index.html` 소스 코드를 분석한 결과, 기존 v2 멀티 맵 아키텍처가 모듈형 맵 확장을 추상화하고 있어 **신규 import 블록 3개와 MAPS 엔트리 3개의 최소 코드 추가**로 통합이 가능합니다.

### 2.1 지점 A: ES Module Import 선언부
- **파일 위치**: `index.html:767-768`
- **주변 코드**:
  ```javascript
  // index.html:762-767
  import {
    CARE_ROOM_MAP,
    buildCareRoom,
    updateCareRoomGimmicks,
    cleanupCareRoom
  } from './maps/care_room.js';
  // >>> 여기에 av_room, computer_lab, library_elem import 블록 3개 추가 <<<
  ```
- **역할**: 브라우저 모듈 로더를 통해 신규 맵 모듈의 4대 필수 요소(`*_MAP`, `build*`, `update*Gimmicks`, `cleanup*`)를 로드합니다.

### 2.2 지점 B: `MAPS` 레지스트리 객체 등록부
- **파일 위치**: `index.html:2130-2131`
- **주변 코드**:
  ```javascript
  // index.html:2121-2131
  const MAPS={
    classroom:{ id:"classroom", name:"교실", icon:"🏫", type:"canvas", build:buildMap },
    science:{ id:"science", name:"과학실", icon:"🧪", type:"canvas", build:buildScienceLab },
    cafeteria:{ id:"cafeteria", name:"급식실", icon:"🍚", type:"canvas", build:buildCafeteria },
    library:{ id:"library", name:"도서관", icon:"📚", type:"canvas", build:buildLibrary },
    art_room:{ ...ART_ROOM_MAP, type:"module", build:buildArtRoom, update:updateArtRoomGimmicks, cleanup:cleanupArtRoom },
    gymnasium:{ ...GYMNASIUM_MAP, type:"module", build:buildGymnasium, update:updateGymnasiumGimmicks, cleanup:cleanupGymnasium },
    music_room:{ ...MUSIC_ROOM_MAP, type:"module", build:buildMusicRoom, update:updateMusicRoomGimmicks, cleanup:cleanupMusicRoom },
    health_office:{ ...HEALTH_OFFICE_MAP, type:"module", build:buildHealthOffice, update:updateHealthOfficeGimmicks, cleanup:cleanupHealthOffice },
    care_room:{ ...CARE_ROOM_MAP, type:"module", build:buildCareRoom, update:updateCareRoomGimmicks, cleanup:cleanupCareRoom },
    // >>> 여기에 av_room, computer_lab, library_elem MAPS 엔트리 3개 추가 <<<
  };
  ```

### 2.3 변경이 불필요한 기존 엔진 구조 (호환 확인됨)
아래 항목들은 기존 코드가 `MAPS`의 엔트리를 동적으로 순회·처리하도록 설계되어 있어 일체의 수정이 불필요합니다:
1. **`mapIsReady(id)` (line 2132)**:
   ```javascript
   if(m.type==="canvas"||m.type==="module") return true;
   ```
   `type: "module"`로 선언된 신규 맵은 자동으로 준비 완료 상태로 판정됩니다.
2. **`updateMapGimmicks(dt)` (lines 2099-2107)**:
   ```javascript
   const activeDef=MAPS[currentMapId];
   if(activeDef?.type==="module"&&typeof activeDef.update==="function"){
     activeDef.update(makeBuildContext(),dt);
   }
   ```
   활성 맵의 `update` 함수를 프레임마다 동적으로 안전 호출합니다.
3. **`buildActiveMap(mapId)` (lines 2200-2226)**:
   이전 맵의 `cleanup(makeBuildContext())` 호출 및 새 맵의 `build(makeBuildContext())` 호출, 그리고 오류 발생 시 `classroom`으로의 안전한 폴백 처리가 완비되어 있습니다.
4. **`makeBuildContext()` (lines 2112-2119)**:
   `THREE`, `mapRoot`, `ROOM_W`, `ROOM_D`, `WALL_H`, `setWallHeight`, `addBox`, `addCyl`, `canvasTex`, `lambert`, `addAABBCollider`, `samplables`, `colliders`, `refillZones`, `hiderSpawns`, `seekerSpawns`, `buildRoomShell` 등 세 모듈이 요구하는 모든 의존성을 제공합니다.
5. **맵 선택 UI 렌더러 3개소**:
   - `renderMapCards()` (`index.html:5057` — 호스트 로비 맵 선택)
   - `renderLobbyPracticeMapCards()` (`index.html:5350` — 대기 학생 연습 맵 선택)
   - `renderPracticeMapCards()` (`index.html:5645` — 타이틀 화면 솔로 연습 맵 선택)
   위 3개 함수 모두 `Object.values(MAPS).forEach(m => ...)`로 동작하므로 `MAPS`에 등록하는 즉시 카드가 자동 생성되고 클릭 이벤트가 바인딩됩니다.

---

## 3. 제안 diff (최소 변경안)

> [!IMPORTANT]
> 아래 diff는 **실제 적용용이 아닌 검토용 제안 diff**입니다.
> 5단계에서는 `index.html`을 수정하지 않으며, 사용자 및 Codex의 명시적 승인 후 적용됩니다.

```diff
diff --git a/index.html b/index.html
--- a/index.html
+++ b/index.html
@@ -767,6 +767,24 @@ import {
   cleanupCareRoom
 } from './maps/care_room.js';
+import {
+  AV_ROOM_MAP,
+  buildAvRoom,
+  updateAvRoomGimmicks,
+  cleanupAvRoom
+} from './maps/av_room.js';
+import {
+  COMPUTER_LAB_MAP,
+  buildComputerLab,
+  updateComputerLabGimmicks,
+  cleanupComputerLab
+} from './maps/computer_lab.js';
+import {
+  LIBRARY_ELEM_MAP,
+  buildLibraryElem,
+  updateLibraryElemGimmicks,
+  cleanupLibraryElem
+} from './maps/library_elem.js';

 /* ============================================================
    Firebase 설정은 이 파일 맨 위 <head>의 "선생님 설정 구역"에서 합니다.
@@ -2130,6 +2148,9 @@ const MAPS={
   health_office:{ ...HEALTH_OFFICE_MAP, type:"module", build:buildHealthOffice, update:updateHealthOfficeGimmicks, cleanup:cleanupHealthOffice },
   care_room:{ ...CARE_ROOM_MAP, type:"module", build:buildCareRoom, update:updateCareRoomGimmicks, cleanup:cleanupCareRoom },
+  av_room:{ ...AV_ROOM_MAP, type:"module", build:buildAvRoom, update:updateAvRoomGimmicks, cleanup:cleanupAvRoom },
+  computer_lab:{ ...COMPUTER_LAB_MAP, type:"module", build:buildComputerLab, update:updateComputerLabGimmicks, cleanup:cleanupComputerLab },
+  library_elem:{ ...LIBRARY_ELEM_MAP, type:"module", build:buildLibraryElem, update:updateLibraryElemGimmicks, cleanup:cleanupLibraryElem },
 };
 function mapIsReady(id){
   const m=MAPS[id];
```

### 3.1 정식 통합 및 배포 단위
1. `index.html`을 정식 실행·배포 진입점으로 사용한다.
2. `maps/` 디렉터리를 상대경로 구조 그대로 함께 배포한다.
3. `maps/av_room.js`, `maps/computer_lab.js`, `maps/library_elem.js`를 배포 패키지에 반드시 포함한다.
4. `index (배포용).html`, `primary_data/index (배포용).html`, 기존 ZIP은 모듈 실행 엔진이 없는 레거시 산출물이므로 신규 맵 3종의 배포 대상으로 사용하지 않는다.

---

## 4. 잠재적 위험 요소 및 대응 방안

| 위험 요소 | 잠재적 영향 | 대응 방안 및 안전장치 |
| :--- | :--- | :--- |
| **`file://` 직접 실행 제약** | 브라우저 CORS 정책으로 ES Module 로드 실패 | 학교 현장 안내문에 `python -m http.server` 또는 로컬 웹 서버/배포 URL 사용 안내 명기 |
| **배포 패키지 누락** | `index.html`만 복사하고 `maps/` 폴더 누락 시 맵 로드 불가 | `buildActiveMap()`의 `try-catch` 블록이 누락 감지 시 자동으로 `classroom`(교실)으로 폴백하여 게임 먹통 방지 |
| **맵 빌드 런타임 오류** | 오브젝트 생성 중 예외 발생 시 화면 멈춤 | `buildActiveMap()` 내 전역 예외 처리기가 에러 로그 출력 후 이전 리소스 정리 및 기본 교실 맵 강제 복구 |
| **cleanup 실패 및 GPU 누수** | 맵 전환 반복 시 메모리 누수 및 프레임 저하 | 세 모듈 모두 `cleanup`에서 전용 머티리얼, 지오메트리, CanvasTexture(`texture.dispose()`) 전수 해제 검증 완료 |
| **클라이언트 버전 불일치** | 방장이 신규 맵을 선택했으나 구버전 학생 클라이언트는 맵이 없음 | `Net.setMapId(m.id)` 수신 시 `mapIsReady(id)` 검사 후 미지원 시 `classroom`으로 안전 폴백 |
| **모바일/태블릿 성능 부하** | 동시 오브젝트 수가 많은 컴퓨터실(PC 24석) 등에서 프레임 드랍 | Zero-Asset 원칙 준수, 작은 장식품 `collide: false` 설정으로 물리 연산량 최소화, CanvasTexture 해상도 256 이하 제한 |
| **맵 ID 충돌** | 기존 4번 도서관(`library`)과 신규 초등 도서실(`library_elem`) 간 혼선 | 맵 ID를 `library`와 명확히 구분된 `library_elem`으로 통일하여 충돌 원천 차단 |

---

## 5. 정식 통합 후 회귀 테스트 계획

통합이 승인되고 `index.html`에 diff가 적용된 후 아래 시나리오를 순차 검증합니다:

1. **로비 맵 선택 UI 검증**:
   - 호스트 로비에 12개 맵 카드(기존 9 + 신규 3)가 정상 렌더링되는지 확인
   - `av_room`, `computer_lab`, `library_elem` 클릭 시 선택 상태(`sel`) 하이라이트 정상 작동
2. **솔로/대기 연습 모드 검증**:
   - 타이틀 화면의 '혼자 연습하기' 및 로비의 '대기 연습'에서 3개 신규 맵 진입 확인
3. **스폰 및 이동/물리 판정 검증**:
   - 지우개 요정 스폰(y=0) 및 이동, 점프, 계단 오르기(시청각실 6단 좌석)
   - 책상 밑(컴퓨터실, 도서실), 서가 빈 슬롯(도서실), 롤스크린 뒤(시청각실) 통과 및 은신
4. **스포이드 및 위장 판정**:
   - 시청각실 의자 붉은 천, 컴퓨터실 모니터 화면, 도서실 책등 색상 추출 확인
5. **리필존 상호작용**:
   - `음향조정실`, `교사연구대`, `사서데스크` 진입 시 물감 리필 정상 반응
6. **게임 라운드 전체 사이클 (베이직/감염 모드)**:
   - 로비 → 술래 룰렛 → 숨는 시간(도망자 위장 / 술래 필통 미니게임) → 찾는 시간(검거 판정) → 결과창 → 로비 복귀
7. **맵 연속 전환 안정성**:
   - 교실 → 시청각실 → 컴퓨터실 → 초등 도서실 → 교실 순환 전환 시 콘솔 오류 0건 및 잔존 오브젝트 0건 확인
8. **교사 긴급 통제 기능**:
   - "얼음!"(전체 동결), 시간 연장, 페이즈 강제 전환 정상 동작 확인

---

## 6. 승인 게이트 및 안전한 롤백 계획

### 6.1 승인 게이트
- **게이트 조건**: 사용자 및 Codex가 본 제안서(`docs/18_followup_maps_integration_proposal.md`)와 전체 프리뷰 회귀 검증 결과를 검토하고 명시적으로 `통합 승인(Proceed to integrate)`을 선언하기 전까지 `index.html` 수정을 시작하지 않고 대기합니다.

### 6.2 롤백 계획 (Rollback Plan)
만약 정식 통합 후 예기치 않은 오류가 발생할 경우, 다음 두 가지 방법으로 롤백합니다:

1. **통합을 독립 커밋한 경우**:
   - 해당 커밋만 `git revert <통합_커밋_해시>`를 수행하여 안전하게 이전 상태로 되돌립니다.
2. **미커밋 상태인 경우**:
   - `index.html`에 추가된 신규 import 블록 3개(`av_room`, `computer_lab`, `library_elem`)와 `MAPS` 엔트리 3개만 정확히 역패치(제거)합니다.
3. **독립 모듈 파일 유지**:
   - `maps/av_room.js`, `maps/computer_lab.js`, `maps/library_elem.js` 파일은 독립 모듈이므로 삭제하지 않고 유지해도 기존 게임 로직에 간섭하지 않으며, 프리뷰 페이지(`maps/preview.html`)에서 계속해서 검증 테스트가 가능합니다.
