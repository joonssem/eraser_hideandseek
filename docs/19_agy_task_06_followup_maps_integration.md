# AGY 작업 지시서 06 — 신규 맵 3종 정식 통합

- 작성일: 2026-09-28
- 실행 담당: AGY
- 검증 담당: Codex
- 기준 브랜치/HEAD: `main` / `51424ea7c5929ef623f7aa3c930f4bdd74ce01b2`
- 상태: 사용자 통합 승인 및 6단계 시작 승인
- 선행 조건: 1~5단계 Codex PASS
- 대상: `av_room`, `computer_lab`, `library_elem`

> **2026-09-28 검증 후 결정:** 구형 `index (배포용).html` 계열에는 `module` build/update/cleanup 실행 경로가 없어 import와 `MAPS` 등록만으로 신규 맵을 실행할 수 없다. 사용자 승인에 따라 최신 `index.html`과 `maps/` 디렉터리를 정식 배포 기준으로 사용하며, 구형 단일 HTML과 ZIP은 레거시 산출물로 유지한다.

## 1. 목표

독립 검증을 마친 신규 맵 3종을 정식 게임의 맵 레지스트리에 등록한다. 이번 단계는 신규 맵 등록과 그에 필요한 배포 HTML 동기화만 수행한다. 신규 기능 추가, 맵 재설계, Firebase 수정은 하지 않는다.

## 2. 시작 전 필수 확인

다음을 UTF-8로 처음부터 끝까지 읽는다.

- `docs/12_agy_train_fix_and_new_spaces_checklist.md`
- `docs/17_agy_task_05_documentation_and_integration_preparation.md`
- `docs/18_followup_maps_integration_proposal.md`
- `maps/README.md`

다음 명령의 실제 출력을 시작 상태로 보존한다.

```powershell
git status --short --branch
git rev-parse HEAD
git diff --check
git diff -- index.html 'index (배포용).html' 'primary_data/index (배포용).html'
```

현재 작업 트리의 기존 변경과 미추적 파일은 승인된 선행 단계 산출물이다. 삭제, 되돌리기, 덮어쓰기, 포맷 일괄 변환을 하지 않는다.

## 3. 허용 변경

- `index.html`
- `index (배포용).html`
- `primary_data/index (배포용).html`
- 이 단계 결과를 기록하기 위한 체크리스트·문서의 최소 상태 변경

금지 사항:

- `maps/*.js`, `maps/preview.html`, 기존·신규 검사 스크립트 수정
- Firebase 설정·규칙·네트워크 로직 수정
- 게임 모드, UI, 스폰, 충돌체, 맵 내부 구현 변경
- 전체 파일 복사로 개발판과 배포판을 강제 동일화
- `index (배포용).zip` 재생성
- commit, push, merge, reset, clean, stash, checkout

## 4. 구현 절차

### 4.1 구조 비교

세 HTML에서 기존 모듈 import 구역과 `MAPS` 객체를 각각 확인한다. 줄 번호가 다르더라도 각 파일의 `care_room` 등록 직후를 기준으로 한다. 파일 전체를 복사하지 않는다.

### 4.2 import 등록

각 대상 HTML의 `care_room.js` import 직후에 다음 세 모듈의 실제 export를 import한다.

- `AV_ROOM_MAP`, `buildAvRoom`, `updateAvRoomGimmicks`, `cleanupAvRoom`
- `COMPUTER_LAB_MAP`, `buildComputerLab`, `updateComputerLabGimmicks`, `cleanupComputerLab`
- `LIBRARY_ELEM_MAP`, `buildLibraryElem`, `updateLibraryElemGimmicks`, `cleanupLibraryElem`

경로는 기존 모듈과 동일하게 `./maps/*.js`를 사용한다.

### 4.3 `MAPS` 등록

각 대상 HTML의 `care_room` 엔트리 다음에 아래 계약과 동등한 엔트리를 정확히 한 번씩 추가한다.

```javascript
av_room:{ ...AV_ROOM_MAP, type:"module", build:buildAvRoom, update:updateAvRoomGimmicks, cleanup:cleanupAvRoom },
computer_lab:{ ...COMPUTER_LAB_MAP, type:"module", build:buildComputerLab, update:updateComputerLabGimmicks, cleanup:cleanupComputerLab },
library_elem:{ ...LIBRARY_ELEM_MAP, type:"module", build:buildLibraryElem, update:updateLibraryElemGimmicks, cleanup:cleanupLibraryElem },
```

그 밖의 분기나 카드 UI를 추가하지 않는다. 기존 코드는 `MAPS`를 동적으로 순회한다.

## 5. 필수 자동 검증

```powershell
node scripts/check_followup_maps.mjs
python scripts/98_check_preview_script.py
git diff --check
```

추가로 세 대상 HTML 각각에 대해 다음을 검사한다.

- 신규 import가 맵별 정확히 1회
- `MAPS` 엔트리가 맵별 정확히 1회
- 기존 `care_room` 및 기존 맵 엔트리 보존
- `library`와 `library_elem`이 서로 다른 ID로 공존
- `<script type="module">` 구문 오류 없음
- 신규 맵 파일 경로가 실제 배포 디렉터리 구조와 일치

## 6. 브라우저 검증

로컬 HTTP 서버와 실제 브라우저 WebGL 환경에서 `index.html`을 검증한다.

1. 로비 맵 카드에 신규 맵 3종이 각각 한 번 표시되는지 확인한다.
2. 연습 모드에서 세 맵을 각각 진입하고 이동·점프·스포이드·리필존을 확인한다.
3. 기존 맵 → 신규 3종 → 기존 맵 순서로 전환해 잔존물과 중복을 확인한다.
4. 각 신규 맵을 최소 3회 재진입한다.
5. JavaScript 예외, NaN, dispose, WebGL 오류를 수집한다.
6. 가능한 경우 호스트 1명과 학생 2명으로 방 생성·참가·맵 선택 동기화를 확인한다. 실제 Firebase 데이터나 규칙은 변경하지 않는다.

다인 접속 검증을 수행하지 못하면 단일 브라우저 PASS와 구분하여 미완료로 보고한다. 증거는 저장소 밖 AGY 아티팩트 디렉터리에 저장한다.

## 7. 배포본 검증

`index (배포용).html`과 `primary_data/index (배포용).html`을 각각 HTTP로 열어 신규 맵 등록과 모듈 로드를 확인한다. 두 파일이 원래 동일한 경우 변경 후 해시도 동일해야 한다. 기존 Firebase 설정이나 배포별 설정 차이를 덮어쓰지 않는다.

ZIP은 이번 단계에서 수정하지 않는다. HTML 검증 및 Codex PASS 후 별도 패키징 승인을 기다린다.

## 8. 완료 보고

```text
[AGY 단계 완료 보고]
단계: 6단계 — 신규 맵 3종 정식 통합

시작 상태:
- 브랜치/HEAD:
- 기존 변경:

변경 파일:
- 파일별 import/MAPS 변경 요약:
- 허용 범위 밖 변경 여부:

자동 검증:
- check_followup_maps:
- preview script 검사:
- HTML별 중복·구문 검사:
- git diff --check:

브라우저 검증:
- 로비/연습 카드:
- 신규 맵 3종 진입·재진입:
- 기존 맵 왕복:
- 콘솔/WebGL 오류:
- 다인 접속 검증 여부와 결과:
- 증거 경로:

배포본:
- 두 배포 HTML 검증 결과:
- 변경 후 해시:
- ZIP 변경 없음 확인:

종료 상태:
- git diff --stat:
- git status --short:
- 미완료/제한:
```

보고 후 즉시 멈춘다. commit, push, ZIP 재생성 및 후속 기능 구현은 하지 않는다.
