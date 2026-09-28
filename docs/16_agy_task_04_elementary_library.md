# AGY 작업 지시서 04 — 초등 도서실 `library_elem` 독립 모듈 구현

- 작성일: 2026-09-28
- 실행 담당: AGY
- 검증 담당: Codex
- 저장소: `C:\chatGPT_test\eraser_hideandseek`
- 기준 브랜치: `main`
- 기준 HEAD: `51424ea`
- 작업 상태: 시작 승인
- 선행 조건: 3단계 컴퓨터실 Codex PASS (2026-09-28)
- 상위 체크리스트: `docs/12_agy_train_fix_and_new_spaces_checklist.md`

## 1. 이번 작업의 목표와 범위

초등학생 눈높이의 포근한 도서실 `library_elem`을 독립 ES 모듈로 구현하고, 독립 프리뷰와 재현 가능한 자동 검사에 연결한다. 맵 ID는 코드·문서·프리뷰·검사 전체에서 반드시 `library_elem`으로 통일한다.

허용되는 변경:

- 신규 `maps/library_elem.js`
- 신규 `scripts/check_library_elem.mjs`
- 필요시 도서실 좌표·프리뷰 문법만 검증하는 최소 보조 스크립트
- `maps/preview.html`에 `library_elem`을 등록하는 최소 변경
- `maps/README.md` 구현 목록에 초등 도서실을 추가하는 최소 변경

수정 금지:

- `index.html`, `index (배포용).html`, `primary_data/`
- 기존 맵 모듈 전체
- 기존 검사 스크립트와 통과 기준
- `docs/12_agy_train_fix_and_new_spaces_checklist.md`의 상태 및 다른 문서
- 5단계 문서·정식 통합 작업

## 2. 시작 전 필수 확인

```powershell
Set-Location -LiteralPath 'C:\chatGPT_test\eraser_hideandseek'
git status --short --branch
git rev-parse HEAD
git diff --check
```

- 작업 시작 시 현재 브랜치, HEAD, `git status --short` 결과를 기록한다.
- 시작 시 아래 Codex 문서 변경 4개는 이번 승인 과정에서 생성된 **예상된 변경**이므로 그대로 보존한다.
  - 수정: `docs/12_agy_train_fix_and_new_spaces_checklist.md`
  - 수정: `docs/README.md`
  - 신규: `docs/16_agy_task_04_elementary_library.md`
  - 신규: `docs/AGY_START_MESSAGE_04.md`
- 사용자 또는 다른 작업자가 만든 변경을 삭제·덮어쓰기·되돌리기 하지 않는다.
- pull, reset, clean, stash, checkout, commit, push, merge를 하지 않는다.
- 다음 파일을 UTF-8로 처음부터 끝까지 읽고 현재 계약을 따른다.
  - `docs/11_additional_map_ideas_and_level_design.md`
  - `docs/12_agy_train_fix_and_new_spaces_checklist.md`
  - `maps/README.md`
  - `maps/computer_lab.js`
  - `maps/av_room.js`
  - `maps/preview.html`
  - `scripts/check_computer_lab.mjs`

시작 상태가 `main`/`51424ea`와 다르거나 위 네 문서 외에 예상하지 못한 변경이 있으면 작업하지 말고 차이를 보고한 뒤 대기한다.

## 3. 모듈 계약

`maps/library_elem.js`는 다음 네 항목을 export한다.

```javascript
export const LIBRARY_ELEM_MAP = {
  id: "library_elem",
  name: "초등 도서실",
  icon: "📚"
};

export function buildLibraryElem(ctx) {}
export function updateLibraryElemGimmicks(ctx, dt) {}
export function cleanupLibraryElem(ctx) {}
```

- 모든 의존성은 `ctx`로 주입받는다.
- 벽 높이는 `setWallHeight(height)` 계약으로만 설정하고 `ctx.WALL_H`를 직접 변경하지 않는다.
- `ROOM_W=120`, `ROOM_D=90` 경계 안에서 구현한다.
- top-level DOM 접근, 타이머 시작, AudioContext 생성, 전역 상태 접근을 금지한다.
- 외부 이미지·GLB·오디오·폰트 없이 Three.js 기본 지오메트리와 Canvas 텍스처만 사용한다.
- 동적 기믹이 없다면 update는 안전한 noop으로 구현한다.
- cleanup 후 update를 호출해도 예외가 없어야 한다.

## 4. 공간 구성 요구사항

### 4.1 낮은 동화책 서가와 책등 위장

- [ ] 높이 2.8~3.2 units 범위의 낮은 서가를 여러 구역에 배치한다.
- [ ] 빨강 `#e63946`, 노랑·주황 `#f4a261`, 청록 `#2a9d8f`, 보라 계열 등 다양한 색·높이·두께의 책등을 절차적으로 표현한다.
- [ ] 책이 빠진 빈 슬롯을 의도적으로 만들고 지우개가 세로로 들어갈 수 있는 실제 빈 공간을 확보한다.
- [ ] 빈 슬롯 앞을 장식용 메쉬나 통짜 AABB로 막지 않는다.
- [ ] 서가 몸체는 내부 치즈를 방지하되 빈 슬롯과 서가 사이 통로는 접근 가능하게 충돌체를 분리한다.
- [ ] 작은 책등은 원칙적으로 `collide: false, sample: true`로 두어 술래 레이캐스트를 과도하게 차폐하지 않게 한다.

### 4.2 세 가지 열람 구역

다음 세 구역이 시각적으로 분리되면서 서로 이동 가능한 동선을 유지해야 한다.

1. **온돌 좌식 존**
   - [ ] 높이 약 0.5 unit의 낮은 원목 마루를 구현한다.
   - [ ] 낮은 원형 탁자와 색이 다른 쿠션·방석을 배치한다.
   - [ ] 마루 가장자리와 방석 사이에 접근 가능한 은신 지점을 둔다.
2. **일반 열람석**
   - [ ] 목재 테이블과 의자로 구성된 열람석 4세트를 구현한다.
   - [ ] 테이블 아래 진입 가능성을 통짜 충돌체로 봉쇄하지 않는다.
3. **창가 카운터 바**
   - [ ] 벽면 또는 창가를 향하는 긴 카운터 테이블을 구현한다.
   - [ ] 높은 다리 의자를 식별 가능하게 배치한다.
   - [ ] 카운터 주변 통로와 의자 사이 이동 공간을 확보한다.

### 4.3 무인 대출·반납기

- [ ] 입구 부근에 민트 `#48cae4`와 흰색 조합의 키오스크를 정확히 2대 배치한다.
- [ ] 화면, 빨간 바코드 스캐너 라인, 영수증 출력구, 도서 반납 투입구를 식별 가능하게 구현한다.
- [ ] 출력구·반납구는 시각적 틈새로 표현하되 플레이어가 완전히 갇히는 밀폐 공간을 만들지 않는다.
- [ ] 스캐너 효과가 동적 갱신을 사용한다면 상태를 모듈 내부에 보관하고 cleanup에서 완전히 정리한다. 정적 발광선으로 구현해도 된다.

## 5. 충돌·위장·성능 계약

- [ ] 큰 가구는 실제 형상에 가까운 최소 AABB로 충돌을 제공한다.
- [ ] 서가 전체를 불필요하게 거대한 단일 AABB로 막아 빈 슬롯을 무효화하지 않는다.
- [ ] 테이블 상판·다리, 카운터, 키오스크는 접근성과 내부 침투 방지를 함께 만족하도록 충돌을 분리한다.
- [ ] 작은 책, 쿠션 장식, 키오스크 세부 부품은 레이캐스트 방패가 되지 않도록 충돌 여부를 신중히 구분한다.
- [ ] 동일한 geometry/material은 가능한 범위에서 공유한다.
- [ ] 매 프레임 Canvas 텍스처를 다시 그리지 않는다.
- [ ] build → update → cleanup → update 순서가 안전해야 한다.
- [ ] 같은 프리뷰 컨텍스트에서 3회 재빌드해도 메쉬·충돌체·samplables·스폰 수가 증가하거나 감소하지 않아야 한다.

## 6. 스폰 및 리필존 계약

- [ ] 지우개 스폰 20개와 술래 스폰 6개를 정확히 등록한다.
- [ ] 모든 스폰은 `new THREE.Vector3(x, 0, z)` 형식이며 방 경계 안에 있어야 한다.
- [ ] 26개 스폰과 모든 AABB의 XZ 겹침을 전수 검사해 0건이어야 한다.
- [ ] 스폰을 서가 몸체, 키오스크, 테이블, 마루 충돌체 내부에 두지 않는다.
- [ ] 지우개 스폰은 서가 틈새 주변, 좌식 존, 일반 열람석, 카운터 주변 등으로 분산한다.
- [ ] 술래 스폰은 한곳에 몰지 않고 주요 통로와 구역 접근점으로 분산한다.
- [ ] 공간 콘셉트에 맞는 리필존을 최소 1개 등록하고 이름·반경을 보고한다.

## 7. 독립 프리뷰 연결

`maps/preview.html`에는 다음 최소 변경만 적용한다.

- `library_elem.js`의 네 export import
- 선택 옵션 `📚 초등 도서실 (library_elem)` 추가
- `AVAILABLE_MAPS.library_elem` 등록
- 기존 7개 맵의 순서, import, build/update/cleanup 계약 보존

프리뷰 HUD에서 다음을 확인한다.

- 지우개 스폰 20
- 술래 스폰 6
- 벽 높이, 충돌체, samplables가 최초 빌드와 3회 재빌드에서 동일
- 다른 맵으로 전환 후 복귀해도 동일 수치 유지

## 8. 자동 검사 `scripts/check_library_elem.mjs`

소스 문자열만 세지 말고 mock THREE 컨텍스트에서 실제 build 결과의 형상·좌표·수량을 검사한다. 최소 검사 항목:

- 네 export와 `library_elem` 메타데이터
- 벽 높이 계약과 방 경계
- 낮은 서가 높이 2.8~3.2 units 및 다채로운 책등 존재
- 막히지 않은 빈 책 슬롯의 존재와 접근성
- 온돌 마루, 낮은 원형 탁자, 쿠션
- 일반 열람 테이블 4세트와 의자
- 창가 카운터 및 높은 의자
- 키오스크 정확히 2대와 주요 세부 요소
- 지우개 20개, 술래 6개, 모두 y=0
- 26개 스폰과 AABB의 XZ 겹침 0건
- 주요 오브젝트와 스폰의 방 경계 이탈 0건
- update 및 cleanup 안전성
- 같은 컨텍스트 3회 반복 재빌드 수치 일치
- 기존 7개 맵을 포함한 8개 맵 교차 전환 성공

검사가 빈 슬롯 접근성이나 가구 수량을 이름 문자열만으로 통과시키지 않도록 실제 좌표와 치수를 근거로 판정한다.

## 9. 필수 검증 명령

```powershell
node --check maps/library_elem.js
node scripts/check_library_elem.mjs
python scripts/98_check_preview_script.py
node scripts/check_computer_lab.mjs
node scripts/check_av_room.mjs
node scripts/check_care_room.mjs
git diff --check
git diff -- maps/library_elem.js maps/preview.html maps/README.md scripts/check_library_elem.mjs
git diff -- index.html 'index (배포용).html' maps/art_room.js maps/gymnasium.js maps/music_room.js maps/health_office.js maps/care_room.js maps/av_room.js maps/computer_lab.js
git status --short
```

- 명령을 실제로 실행하고 종료 코드와 핵심 출력을 보고한다.
- 검사 실패를 숨기거나 기준을 완화해 통과시키지 않는다.
- GUI 검증을 실행하지 못하면 통과로 추정하지 말고 미실행 사유를 적는다.

## 10. 브라우저 육안 검증

로컬 HTTP 서버에서 `maps/preview.html`을 열고 다음을 확인한다.

- [ ] 낮은 서가와 다양한 책등이 초등 도서실 콘셉트로 식별됨
- [ ] 빈 책 슬롯이 실제로 비어 있고 앞뒤가 장식·충돌체로 봉쇄되지 않음
- [ ] 온돌 좌식 존, 일반 열람석, 창가 카운터 바가 구분됨
- [ ] 키오스크 2대와 스캐너·출력구·반납구가 식별됨
- [ ] 쿼터·상공·전면 뷰에서 주요 가구가 방 경계를 넘지 않음
- [ ] 스폰 마커가 AABB 와이어프레임 안에 들어가지 않음
- [ ] cleanup·재빌드 3회 후 HUD와 렌더링이 동일함
- [ ] `computer_lab` → `library_elem` → `av_room` → `care_room` → `library_elem` 전환에서 잔존물·중복·콘솔 오류가 없음

최소 증거:

- 최초 로드 전체 쿼터 뷰
- 상공 뷰에서 세 열람 구역과 동선
- 빈 책 슬롯 확대 화면
- 키오스크 2대 확대 화면
- 3회 재빌드 후 HUD
- 맵 왕복 복귀 화면과 오류 0건 콘솔 기록

스크린샷과 로그는 저장소가 아닌 AGY 아티팩트 디렉터리에 저장한다.

## 11. 완료 보고 후 정지

```text
[AGY 단계 완료 보고]
단계: 4단계 — 초등 도서실 library_elem 독립 모듈
기준: main / 51424ea / 3단계 Codex PASS

시작 상태:
- 브랜치:
- HEAD:
- 시작 시 git status --short:

변경 파일:
- maps/library_elem.js
- maps/preview.html
- maps/README.md
- scripts/check_library_elem.mjs
- (추가 파일이 있다면 전부 기재)

핵심 구현 수량:
- 낮은 서가:
- 빈 책 슬롯:
- 온돌 좌식 존 구성:
- 일반 열람 테이블/의자:
- 카운터/높은 의자:
- 키오스크:
- 지우개 스폰: /20
- 술래 스폰: /6
- 충돌체:
- samplables:
- 리필존:

접근성·안전 검사:
- 스폰-AABB XZ 겹침:
- 방 경계 이탈:
- 빈 슬롯 접근성:
- 밀폐·무적 지점:

실행한 검증과 실제 결과:
- 명령:
  종료 코드/결과:

3회 재빌드 및 교차 전환:
- 회차별 HUD:
- 수량 변화:
- 잔존물/중복/콘솔 오류:

육안 검증:
- 실행 여부:
- 증거 아티팩트 절대 경로:
- 결과 또는 미실행 이유:

미완료/제한:
- ...

종료 상태:
- 종료 시 git status --short:

Codex가 확인할 핵심:
- 실제 접근 가능한 빈 책 슬롯
- 세 열람 구역과 동선
- 키오스크 2대
- 충돌·스폰 안전성
- 3회 재빌드와 8개 맵 회귀
```

보고 후 즉시 멈추고 Codex의 `PASS` 판정을 기다린다. 5단계 문서·통합 준비를 시작하지 않는다.
