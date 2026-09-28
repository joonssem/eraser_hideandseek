# AGY 작업 지시서 05 — 신규 맵 3종 문서 정리 및 정식 통합 준비

- 작성일: 2026-09-28
- 실행 담당: AGY
- 검증 담당: Codex
- 저장소: `C:\chatGPT_test\eraser_hideandseek`
- 기준 브랜치: `main`
- 기준 HEAD: `51424ea`
- 작업 상태: 시작 승인
- 선행 조건: 1~4단계 Codex PASS
- 대상 맵: `av_room`, `computer_lab`, `library_elem`
- 상위 체크리스트: `docs/12_agy_train_fix_and_new_spaces_checklist.md`

## 1. 이번 단계의 목표

시청각실·컴퓨터실·초등 도서실 독립 모듈을 정식 배포 게임에 통합하기 전에 문서·검사·통합 제안서를 완성한다.

이번 단계는 **통합 준비 단계**다. `index.html`을 실제로 수정하거나 신규 맵을 배포 목록에 넣지 않는다. AGY가 제출한 통합안과 전체 회귀 증거를 Codex가 검토하고 사용자가 별도로 승인한 이후에만 실제 통합 작업을 시작한다.

## 2. 허용 범위와 금지 범위

허용되는 변경:

- `maps/README.md`의 세 신규 맵 계약·실행법·구현 상태 보완
- 신규 `scripts/check_followup_maps.mjs` 또는 동등한 통합 전 회귀 검사 스크립트
- 신규 `docs/18_followup_maps_integration_proposal.md`
- 필요시 이번 단계 결과를 정리하는 `interim_reports/` 보고서 1개
- `docs/README.md`에 새 문서 링크를 추가하는 최소 변경

수정 금지:

- `index.html`, `index (배포용).html`, `primary_data/`
- `maps/preview.html`
- `maps/av_room.js`, `maps/computer_lab.js`, `maps/library_elem.js`
- 그 밖의 기존 맵 모듈
- 기존 검사 기준 완화 또는 기존 검사 파일 수정
- Firebase 설정, 게임 모드, UI, 네트워크 로직
- commit, push, merge, reset, clean, stash, checkout

검사에서 문제가 발견되면 이번 단계에서 소스 코드를 즉시 고치지 않는다. 재현 조건, 영향 파일, 실패 로그를 보고하고 Codex의 재작업 범위 지정을 기다린다.

## 3. 시작 전 상태 확인

```powershell
Set-Location -LiteralPath 'C:\chatGPT_test\eraser_hideandseek'
git status --short --branch
git rev-parse HEAD
git diff --check
```

현재 작업 트리에는 3·4단계 및 별도 아이디어 문서의 승인된 변경이 존재한다. 모두 보존하고 덮어쓰지 않는다.

예상된 기존 변경:

- `docs/12_agy_train_fix_and_new_spaces_checklist.md`
- `docs/README.md`
- `docs/16_agy_task_04_elementary_library.md`
- `docs/AGY_START_MESSAGE_04.md`
- `maps/README.md`
- `maps/preview.html`
- `maps/library_elem.js`
- `scripts/check_library_elem.mjs`
- `future_projects/learning_adventure_game/README.md`
- 이 지시서와 `docs/AGY_START_MESSAGE_05.md`

위 목록 외 변경이 있으면 작업 전 보고한다.

## 4. 필수 사전 조사

다음 문서를 UTF-8로 처음부터 끝까지 읽는다.

- `README.md`
- `maps/README.md`
- `docs/09_new_maps_integration_proposal.md`
- `docs/11_additional_map_ideas_and_level_design.md`
- `docs/12_agy_train_fix_and_new_spaces_checklist.md`
- `docs/14_agy_task_02_av_room.md`
- `docs/15_agy_task_03_computer_lab.md`
- `docs/16_agy_task_04_elementary_library.md`

다음 코드의 실제 구조를 읽고 줄 번호와 계약을 기록한다.

- `index.html`의 ES module import 구역
- `MAPS` 객체 등록 구역
- `mapIsReady()`
- 활성 맵 build/update/cleanup 분기
- `maps/preview.html`의 `AVAILABLE_MAPS`
- 세 신규 맵의 export 및 생명주기 함수

과거 `docs/09_new_maps_integration_proposal.md`는 기존 신규 맵 5종 통합 기록이다. 그대로 복사하지 말고 현재 `index.html` 구조와 세 신규 맵에 맞게 새 제안서를 작성한다.

## 5. 명칭과 계약 정합성 정리

전체 저장소에서 다음 표현을 검색한다.

```powershell
rg -n "library_elementary|library_elem|av_room|computer_lab" . -g '!intermediate_results/**' -g '!primary_data/**'
```

요구사항:

- 새 코드·실행 문서에서 맵 ID를 `library_elem`으로 통일한다.
- 역사 기록이나 원본 초안의 표현은 의미 없이 일괄 변경하지 않는다.
- `library_elementary`가 남아 있다면 파일·줄·문맥을 분류하고 실제 수정 필요 여부를 보고한다.
- 세 맵 모두 메타데이터, build, update, cleanup 네 export 계약을 문서화한다.
- 구현 완료 기능과 보류 기능을 구분한다.
- 배포 단위가 `index.html`과 `maps/` 폴더를 함께 포함해야 함을 명시한다.

## 6. `maps/README.md` 보완 기준

다음을 한곳에서 확인할 수 있게 정리한다.

- 로컬 HTTP 서버 실행 및 `maps/preview.html` 접속법
- 세 신규 맵의 ID, 이름, 아이콘
- 각 맵의 네 export 이름
- 벽 높이, 스폰 수, 대표 오브젝트, 리필존
- update 기믹과 cleanup 대상
- 알려진 제한·보류 항목
- 독립 검사 명령

기존 8개 맵 설명과 공통 계약을 삭제하거나 약화하지 않는다.

## 7. 통합 전 자동 회귀 검사

세 신규 맵 검사와 기존 중요 회귀 검사를 한 명령으로 실행할 수 있는 `scripts/check_followup_maps.mjs`를 작성한다.

검사기는 최소 다음 명령을 순서대로 실행하고, 하나라도 실패하면 비정상 종료해야 한다.

```powershell
node --check maps/av_room.js
node --check maps/computer_lab.js
node --check maps/library_elem.js
node scripts/check_av_room.mjs
node scripts/check_computer_lab.mjs
node scripts/check_library_elem.mjs
node scripts/check_care_room.mjs
python scripts/98_check_preview_script.py
```

추가 확인:

- 세 신규 맵의 ID와 네 export 중복·누락 여부
- `maps/preview.html`에 세 맵이 정확히 한 번씩 등록됐는지
- 기존 8개 맵 교차 전환과 cleanup 검사 결과
- 검사 스크립트가 Windows에서도 종료 코드를 올바르게 전달하는지

외부 패키지를 새로 설치하지 않는다.

## 8. 프리뷰 전체 회귀 검사

프리뷰에서 현재 8개 독립 모듈 맵을 각각 최소 3회 선택·재빌드한다.

대상:

- `art_room`
- `gymnasium`
- `music_room`
- `health_office`
- `care_room`
- `av_room`
- `computer_lab`
- `library_elem`

확인 항목:

- 각 맵 HUD의 벽 높이·스폰·충돌체·samplables가 회차별 동일
- 이전 맵 오브젝트와 동적 기믹 잔존물 0건
- 중복 메쉬·스폰·충돌체 누적 0건
- JavaScript 예외, NaN, invalid material, dispose, WebGL 오류 0건
- 동적 기믹이 다른 맵에서 계속 실행되지 않음

권장 전환 순서:

```text
art_room → gymnasium → music_room → health_office → care_room
→ av_room → computer_lab → library_elem → 역순 복귀
```

스크린샷·콘솔 로그·회차별 HUD 표는 저장소 밖 AGY 아티팩트 디렉터리에 저장한다.

## 9. 신규 통합 제안서 작성

신규 `docs/18_followup_maps_integration_proposal.md`에 다음을 포함한다.

### 9.1 현재 상태

- 기존 배포 게임에 통합된 맵과 프리뷰 전용 맵 구분
- 세 신규 맵의 독립 검사·브라우저 검증 상태
- 현재 기준 HEAD와 미커밋 변경 목록

### 9.2 실제 통합 지점

현재 `index.html`의 실제 줄 번호와 주변 함수명을 근거로 다음 변경을 제안한다.

- 세 신규 ES module import
- `MAPS` 객체에 모듈 맵 3종 등록
- `mapIsReady()`와 build/update/cleanup 경로의 호환성
- 맵 선택 UI가 `MAPS` 등록을 통해 자동 반영되는지 여부
- 별도 컨텍스트 브리지 변경이 필요한지 여부

추측성 의사 코드를 실제 코드처럼 쓰지 않는다. 현재 구조로 변경이 불필요한 항목도 명확히 기록한다.

### 9.3 제안 diff

- 실제 적용 가능한 최소 diff를 코드 블록으로 제시한다.
- 이 단계에서는 그 diff를 `index.html`에 적용하지 않는다.
- 예상 변경 파일을 정확히 나열한다.
- 신규 맵 파일과 검사 파일을 배포에 포함해야 함을 명시한다.

### 9.4 위험과 대응

- `file://` 직접 실행과 ES module 제약
- `maps/` 배포 누락
- 맵 build 예외
- cleanup 실패와 동적 리소스 잔존
- Firebase 온라인 방에서 서로 다른 배포 버전 사용
- 태블릿 성능과 메모리
- 맵 ID 충돌 및 저장된 방 설정 호환성

### 9.5 통합 후 회귀 계획

- 기본 로비와 맵 선택
- 기존 맵과 신규 맵 전환
- 지우개·술래 스폰
- 이동·점프·스포이드·검거·리필존
- 베이직·감염 모드 전체 라운드
- 호스트·학생 다중 접속
- 모바일 가로 화면과 실제 학교 기기
- 콘솔·성능·메모리 관찰

### 9.6 승인 게이트와 롤백

- 통합 전 기준점
- 실제 통합을 하나의 독립 변경으로 유지하는 방법
- 문제 발생 시 되돌릴 import·MAPS 항목
- 신규 모듈 파일을 삭제하지 않고 등록만 제거하는 안전한 롤백
- 사용자 승인 전 실제 적용 금지

## 10. 필수 명령

```powershell
node scripts/check_followup_maps.mjs
node --check maps/av_room.js
node --check maps/computer_lab.js
node --check maps/library_elem.js
node scripts/check_av_room.mjs
node scripts/check_computer_lab.mjs
node scripts/check_library_elem.mjs
node scripts/check_care_room.mjs
python scripts/98_check_preview_script.py
rg -n "library_elementary|library_elem|av_room|computer_lab" . -g '!intermediate_results/**' -g '!primary_data/**'
git diff --check
git diff -- index.html 'index (배포용).html' primary_data
git status --short
```

`git diff -- index.html ...` 출력은 없어야 한다. 출력이 있으면 즉시 중단하고 보고한다.

## 11. 완료 보고 형식

```text
[AGY 단계 완료 보고]
단계: 5단계 — 신규 맵 3종 문서 정리 및 정식 통합 준비
기준: main / 51424ea / 1~4단계 Codex PASS

시작 상태:
- 브랜치/HEAD:
- 기존 변경:

문서 정합성:
- maps/README.md 변경 요약:
- library_elementary 검색 결과와 처리:
- 구현/보류 기능 정리:

통합 전 검사:
- check_followup_maps 결과:
- 개별 검사 결과:
- 8개 맵 × 3회 프리뷰 결과:
- 콘솔/NaN/dispose/WebGL 오류:
- 증거 아티팩트 경로:

통합 제안:
- 제안서 경로:
- 실제 index.html 통합 지점:
- 예상 변경 파일:
- 실제 index.html 변경 여부: 변경 없음

롤백 및 위험:
- 기준점:
- 롤백 방법:
- 남은 현장 검증:

종료 상태:
- git diff --check:
- 보호 파일 diff:
- git status --short:

미완료/제한:
- ...

Codex가 확인할 핵심:
- 문서·코드 ID 일치
- 통합 제안의 실제 코드 정합성
- 전체 프리뷰 회귀
- index.html 무변경
- 롤백 가능성
```

보고 후 즉시 멈춘다. `index.html` 통합, commit, push, merge를 실행하지 않는다.
