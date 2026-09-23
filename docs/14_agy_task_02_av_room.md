# AGY 작업 지시서 02 — 시청각실 `av_room` 독립 모듈 구현

- 작성일: 2026-09-23
- 실행 담당: AGY
- 검증 담당: Codex
- 저장소: `D:\Projects\eraser_hideandseek`
- 기준 브랜치: `main`
- 기준 커밋: `cd38d70` + 1단계 로컬 변경
- 작업 상태: 완료 — Codex PASS (2026-09-23)
- 선행 조건: 1단계 돌봄교실 기차 수정 Codex PASS
- 상위 체크리스트: `docs/12_agy_train_fix_and_new_spaces_checklist.md`

## 1. 이번 작업의 범위

이번 세션에서는 시청각실 `av_room`을 **독립 맵 모듈로 구현하고 프리뷰·자동 검사에 연결**한다.

허용되는 변경 범위:

- 신규 `maps/av_room.js`
- 신규 `scripts/check_av_room.mjs`
- `maps/preview.html`의 최소 등록 변경
- 구현 사실을 반영하는 `maps/README.md`의 최소 변경

금지되는 변경 범위:

- `index.html`, `index (배포용).html`
- 기존 `maps/care_room.js`를 포함한 다른 맵 모듈
- 컴퓨터실·도서실 구현
- 기존 테스트 및 문서의 요구 기준 완화

## 2. 시작 전 필수 확인

```powershell
Set-Location -LiteralPath 'D:\Projects\eraser_hideandseek'
git status --short --branch
git rev-parse HEAD
git diff -- maps/care_room.js
```

- 현재 미추적 문서·중간 결과·스크립트와 1단계 기차 수정은 보존한다.
- pull, reset, clean, stash, checkout, commit, push, merge를 하지 않는다.
- 다음 파일을 UTF-8로 처음부터 끝까지 읽는다.
  - `docs/11_additional_map_ideas_and_level_design.md`
  - `docs/12_agy_train_fix_and_new_spaces_checklist.md`
  - `intermediate_results/new_maps_specification.json`
  - `maps/README.md`
  - `maps/art_room.js`
  - `maps/gymnasium.js`
  - `maps/preview.html`

## 3. 구현 계약

### 3.1 필수 export

`maps/av_room.js`는 다음 네 항목을 export한다.

```javascript
export const AV_ROOM_MAP = { id: "av_room", name: "시청각실", icon: "🎬" };
export function buildAvRoom(ctx) {}
export function updateAvRoomGimmicks(ctx, dt) {}
export function cleanupAvRoom(ctx) {}
```

- 모든 의존성은 `ctx`로 주입받고 최상위 부작용을 만들지 않는다.
- `setWallHeight(30)` 계약을 사용한다. `ctx.WALL_H`에 직접 대입하지 않는다.
- 엔진 공통 규격인 `ROOM_W=120`, `ROOM_D=90` 안에 배치한다. 기획 JSON의 100×110은 콘셉트 산출치이므로 엔진 경계를 넘지 않도록 Z축 배치를 90-unit 규격에 맞게 압축한다.
- 외부 에셋 없이 Three.js 기본 지오메트리와 Canvas 텍스처만 사용한다.

### 3.2 공간과 오브젝트

- [ ] 무대: 70×25×2.2 units, 중심은 가능한 한 `(0, 1.1, -31)` 부근에 둔다.
- [ ] 대형 롤스크린: 폭 55, 높이 20을 기준으로 한다.
- [ ] 스크린 뒤편: 최소 1.8-unit 깊이의 실제 진입 가능한 은신 통로를 만든다.
- [ ] 스타디움 바닥: 6단, 단차 1.5, 단별 깊이 약 7~8 units로 구성한다.
- [ ] 좌석: 6행×10석, 총 60석을 정확히 생성한다.
- [ ] 좌석은 붉은 벽돌색 `#9e2a2b`이며 등받이, 접힌 방석, 다리 프레임을 시각적으로 구분한다.
- [ ] 좌석 아래 및 접힌 방석 주변에 지우개가 숨을 수 있는 시야 차폐 지점을 확보한다.
- [ ] 흡음 패널 `#d8d4cd`을 벽면에 반복 배치한다.
- [ ] 무대 양옆에 두꺼운 이중 방음문 2개를 구현한다.
- [ ] 천장 빔프로젝터를 `(0, 24, 5)` 부근에 배치하고 스크린 방향의 반투명 광선 효과를 만든다.
- [ ] 무대 원목 `#8c5a2b`, 스크린 `#f4f1de`, 방음문 `#3d405b` 팔레트를 사용한다.

### 3.3 충돌·파쿠르·성능 규칙

- [ ] 무대와 각 계단 단은 실제 높이와 맞는 지지 충돌을 제공한다.
- [ ] 6단 전체를 하나의 통짜 AABB로 막지 않는다. 플레이어가 낮은 단에서 높은 단으로 이동 가능한 구조여야 한다.
- [ ] 의자 60개 각각에 과도한 중복 충돌체를 만들지 말고, 실제 은신·통로를 보존하는 행 단위 또는 프레임 단위 충돌 전략을 사용한다.
- [ ] 스크린 뒤 1.8-unit 통로를 통짜 충돌체로 막지 않는다.
- [ ] 작은 장식은 `collide: false, sample: true`를 우선 사용한다.
- [ ] 광선과 흡음 패널 반복 재질·지오메트리는 가능한 범위에서 공유하고 cleanup 가능한 상태로 관리한다.
- [ ] 맵 반복 빌드 시 오브젝트, 타이머, 재질이 중복되지 않는다.

### 3.4 스폰

- [ ] 지우개 스폰 20개와 술래 스폰 6개를 정확히 만든다.
- [ ] 모든 스폰은 `new THREE.Vector3(x, 0, z)` 형식으로 등록한다.
- [ ] 스폰은 방 경계 안, 이동 가능한 바닥 위, AABB 내부가 아닌 곳에 둔다.
- [ ] 술래 스폰은 무대·중앙 통로·후방 좌석 접근점을 분산해 배치한다.
- [ ] 고단 좌석 위 스폰이 필요하면 현재 엔진의 `y=0` 스폰 계약을 깨지 말고 제외한다.

## 4. 프리뷰 및 자동 검사

### 4.1 `maps/preview.html`

- `av_room.js`를 ES module로 import한다.
- 맵 선택 목록과 레지스트리에 `av_room`을 추가한다.
- 기존 5개 맵의 선택·빌드·업데이트·cleanup 동작을 변경하지 않는다.
- 선택 시 제목, 벽 높이, 스폰 수, 충돌체 수, samplables 수가 정상 표시되어야 한다.

### 4.2 `scripts/check_av_room.mjs`

최소 다음 항목을 자동 검사한다.

- 4종 export와 메타데이터
- `setWallHeight(30)` 호출
- 지우개 20개, 술래 6개 및 전부 `y=0`
- 좌석 총 60개를 검증할 수 있는 결정적 구조 또는 빌드 계수
- 6단 계단 구조
- 스크린 뒤 은신 통로가 충돌체로 봉쇄되지 않음
- 모든 스폰과 AABB의 XZ 겹침 0건
- cleanup 후 안전한 update
- 3회 반복 빌드·cleanup 수치 일치
- 기존 5개 맵과의 교차 전환에서 예외 없음

테스트가 구현에 맞추어 거짓 통과하지 않도록 실제 빌드 결과를 검사한다.

## 5. 필수 실행 명령

```powershell
node --check maps/av_room.js
node --check maps/preview.html
node scripts/check_av_room.mjs
node scripts/check_care_room.mjs
git diff --check
git diff -- maps/av_room.js maps/preview.html maps/README.md scripts/check_av_room.mjs
git diff -- index.html 'index (배포용).html' maps/care_room.js
git status --short
```

주의: `node --check maps/preview.html`이 Node의 확장자 제한으로 실행 불가하면 이를 실패로 숨기지 말고 실제 오류를 보고한 뒤, HTML의 module script를 별도 추출하거나 브라우저 프리뷰로 검증한다.

## 6. 육안 검증

로컬 HTTP 서버에서 `maps/preview.html`을 열고 다음을 확인한다.

- [ ] 시청각실 선택 시 콘솔 오류 없이 렌더링됨
- [ ] 무대, 스크린, 6단 좌석, 60석, 방음문 2개, 프로젝터가 식별 가능함
- [ ] 스크린 뒤 통로와 좌석 아래 은신 공간이 시각적으로 열려 있음
- [ ] 스폰 마커가 충돌체 와이어프레임 내부에 들어가지 않음
- [ ] 쿼터·상공·전면 뷰에서 주요 구조가 방 경계를 넘지 않음
- [ ] 클린업·재빌드 3회 후 수량 증가나 중복 오브젝트가 없음
- [ ] 기존 돌봄교실로 전환했을 때 기차가 정상 주행하고, 다시 시청각실로 돌아와도 오류 없음

GUI를 사용할 수 없으면 검증했다고 추정하지 말고 `미실행` 및 이유를 보고한다.

## 7. 완료 보고 후 정지

```text
[AGY 단계 완료 보고]
단계: 2단계 — 시청각실 av_room 독립 모듈
기준: cd38d70 + 1단계 로컬 변경

완료 체크:
- [x] ...

변경 파일:
- maps/av_room.js
- maps/preview.html
- maps/README.md
- scripts/check_av_room.mjs

핵심 수량:
- 좌석: /60
- 계단: /6
- 지우개 스폰: /20
- 술래 스폰: /6
- 충돌체:
- samplables:

실행한 검증과 실제 결과:
- 명령:
  결과:

육안 검증:
- 실행 여부:
- 결과 또는 미실행 이유:

미완료/제한:
- ...

Codex가 확인할 핵심:
- 엔진 규격 내 배치
- 6단·60석 및 은신 공간
- 충돌 및 스폰 안전성
- 기존 맵 회귀와 cleanup
```

보고 후 즉시 멈추고 Codex의 `PASS`를 기다린다. 컴퓨터실 작업을 시작하지 않는다.
