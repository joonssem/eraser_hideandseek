# AGY 작업 지시서 07 — P1 대형 가구 배치 및 AABB 동기화

- 작성일: 2026-09-29
- 실행 담당: AGY
- 검증 담당: Codex
- 기준 브랜치/HEAD: `main` / `4bc1291c9465047814ade1eae3f39d3d465658b1`
- 상태: P0 Codex PASS, P1 실행 승인
- 선행 조건: 시청각실 의자 하부 클리핑 수정(P0) Codex PASS
- 대상 모듈: `maps/av_room.js`, `maps/computer_lab.js`
- 상위 기준: `docs/21_av_room_and_computer_lab_enhancement_spec.md`, `docs/22_av_room_and_computer_lab_enhancement_checklist.md`

## 1. 목표와 중단 원칙

P1 범위의 대형 가구와 구조 변화만 구현한다.

1. 시청각실 무대 좌측 업라이트 피아노
2. 시청각실 펼쳐진 의자 5석
3. 컴퓨터실 미정리 키보드 4석과 돌출·회전 의자 4석
4. 컴퓨터실 후방 전산 책장과 헤드셋 보관함

구현과 검증을 마치면 완료 보고 후 즉시 멈춘다. Codex가 P1을 `PASS`하기 전에는 P2 마우스 24개, P3 모니터 화면·무대 조명, P4 최종 검증 단계로 넘어가지 않는다.

## 2. 작업 전 필수 확인

다음 문서를 UTF-8로 처음부터 끝까지 읽는다.

- `docs/21_av_room_and_computer_lab_enhancement_spec.md`
- `docs/22_av_room_and_computer_lab_enhancement_checklist.md`
- `docs/14_agy_task_02_av_room.md`
- `docs/15_agy_task_03_computer_lab.md`
- `maps/README.md`

작업 전 다음 명령의 실제 출력을 보존한다.

```powershell
git status --short --branch
git rev-parse HEAD
git diff --check
git diff -- maps/av_room.js maps/computer_lab.js scripts/check_av_room.mjs scripts/check_computer_lab.mjs
```

현재 작업 트리의 기존 문서 변경, P0 구현, P0 검사 스크립트와 미추적 파일은 승인된 선행 작업이다. 삭제·되돌리기·덮어쓰기·일괄 포맷 변환을 하지 않는다.

## 3. 허용 변경과 금지 사항

허용 변경:

- `maps/av_room.js`
- `maps/computer_lab.js`
- `scripts/check_av_room.mjs`
- `scripts/check_computer_lab.mjs`
- P1 전용 신규 검사 스크립트가 꼭 필요한 경우 `scripts/check_*p1*.mjs`
- 검증 완료 후 `docs/22_av_room_and_computer_lab_enhancement_checklist.md`의 P1 상태를 `Codex 검증 대기`로만 갱신

금지 사항:

- `index.html`, 배포용 HTML/ZIP, Firebase·네트워크·게임 모드 수정
- P0 블로커 삭제·축소 또는 P0 검사 약화
- P2 마우스 24개 구현
- P3 모니터 CanvasTexture 6종, 무대 조명 6기, 반도어, 깜빡임 구현
- P4 완료 처리 또는 P1 자체 `PASS` 선언
- 관련 없는 문서·맵·스크립트 수정
- commit, push, merge, reset, clean, stash, checkout

## 4. P1 구현 요구사항

### 4.1 시청각실 업라이트 피아노

- 무대 좌측 `x in [-28, -20]`, `z in [-36, -28]`, 바닥 `y=2.2`에 접지한다.
- 본체는 약 `7.0 × 3.2 × 5.8` 유닛의 칠흑색 유광 업라이트 형태로 만든다.
- 흑백 건반, 건반부, 보면대, 악보, 황동 페달 3개와 사각 피아노 의자를 구분 가능한 형상으로 구현한다.
- 피아노 본체 AABB는 정확히 `min [-28, 2.2, -36]`, `max [-20, 8.0, -28]` 범위를 보호해야 한다.
- 피아노와 의자의 샘플 가능 표면을 의도적으로 지정하고, 작은 장식 메쉬는 불필요한 충돌체를 만들지 않는다.
- 모든 무대 스폰과 AABB의 XZ 겹침이 0건이어야 한다.

### 4.2 펼쳐진 의자 5석

- 대상은 정확히 `Row0 Col2`, `Row1 Col7`, `Row2 Col3`, `Row3 Col8`, `Row4 Col1`로 고정한다. 인덱스는 기존 `rowConfig`와 `colX`의 0-based 기준이다.
- 대상 5석만 좌판을 수평 착석 상태로 만들고 나머지 55석은 기존 접힌 형태와 수량을 보존한다.
- 펼쳐진 좌판 상단은 `tier_y + 1.8`에 맞추고 실제로 착지 가능한 얇은 수평 AABB를 둔다.
- 좌판 발판은 대상 좌석 범위를 넘는 통짜 행 충돌체로 만들지 않는다.
- 새 발판과 P0 베이스 블로커가 충돌하더라도 중앙 통로와 행간 이동을 막지 않아야 한다.

### 4.3 컴퓨터실 미정리 키보드·의자

- 기존 좌석 인덱싱을 명시하고, 정확히 4개의 키보드와 정확히 4개의 의자만 변형한다.
- 키보드는 Y축 `15~25도` 회전과 `0.3~0.5` 유닛 위치 오프셋을 적용한다.
- 의자는 책상 뒤쪽으로 `0.8~1.4` 유닛 돌출시키고 Y축 `20~45도` 회전한다.
- 각 변형 의자의 시각 메쉬 전체와 의자 AABB 중심을 동일한 좌표 계산에서 파생시켜 동기화한다.
- 회전된 시각 형상을 감싸도록 AABB 크기를 계산하되 중앙 통로, 책상, 인접 의자와 불필요하게 겹치지 않게 한다.
- 기존 학생 PC 24석, 책상·모니터·본체·의자 수량 및 마지막 행 재빌드 안정성을 보존한다.

### 4.4 후방 책장과 헤드셋 보관함

- 후방 좌측 책장은 `x in [-42, -26]`, `z in [38, 42]` 안에 배치한다. 3단 구조, 컴퓨터 교재·코딩 교과서·소프트웨어 박스를 표현하고 외곽 AABB를 등록한다.
- 후방 우측 헤드셋함은 `x in [26, 40]`, `z in [38, 42]` 안에 2단 이동식 수납 구조로 배치한다.
- 헤드셋은 8~12개만 생성하며 헤드밴드와 이어패드가 식별되어야 한다. 작은 헤드셋 부품은 장식용 비충돌로 둔다.
- 두 구조물은 방 경계 내부에 있어야 하고 기존 후방 Hider/Seeker 스폰과 XZ 겹침이 0건이어야 한다.

## 5. 검사 스크립트 보강 요구사항

기존 검사를 단순히 통과시키기 위한 문자열 검사만 추가하지 않는다. 빌드 결과의 실제 메쉬·AABB·좌표를 직접 검사한다.

`check_av_room.mjs`에는 최소한 다음을 추가한다.

- 피아노 본체 AABB의 정확한 min/max와 무대 스폰 비겹침
- 건반·페달 3개·보면대·피아노 의자의 존재
- 펼쳐진 좌판 정확히 5개, 지정 좌석 일치, 나머지 접힌 좌판 55개
- 좌판 상단 높이와 발판 AABB 5개
- P0 블로커 12개와 기존 P0 런타임 검사의 지속 PASS
- 중앙·외곽 통로 비침범

`check_computer_lab.mjs`에는 최소한 다음을 추가한다.

- 변형 키보드 4개와 각 회전·오프셋 범위
- 변형 의자 4개와 돌출·회전 범위
- 변형 의자의 메쉬 좌표와 AABB 중심 동기화
- 책장 위치·3단·외곽 AABB
- 헤드셋함 위치·2단 및 헤드셋 8~12개
- 신규 AABB와 26개 스폰의 XZ 겹침 0건
- PC 24석과 3회 재빌드 수량 보존

검사가 구현 상수를 그대로 복사해 자가충족하지 않도록 실제 빌드 결과를 기준으로 판정한다. 신규 검사에 임시 조사 파일을 남기지 않는다.

## 6. 필수 자동 검증

다음을 실제로 실행하고 종료 코드와 핵심 출력을 보고한다.

```powershell
node --check maps/av_room.js
node --check maps/computer_lab.js
node scripts/check_av_room.mjs
node scripts/check_av_room_runtime_penetration.mjs
node scripts/check_computer_lab.mjs
node scripts/check_followup_maps.mjs
python scripts/98_check_preview_script.py
git diff --check
```

`check_followup_maps.mjs`가 실행 환경의 자식 프로세스 제한으로 실패하면 성공으로 추정하지 않는다. 8개 하위 명령을 개별 실행하고 통합 스크립트 실패 원인과 구분해 보고한다.

## 7. 브라우저·육안 검증

로컬 HTTP 환경의 `maps/preview.html`과 실제 `index.html` 연습 모드에서 확인한다.

1. 시청각실 피아노의 무대 접지, 부품 누락, 벽·스크린 관통 여부
2. 펼쳐진 의자 5석만 수평인지와 실제 착지·이탈 가능 여부
3. P0 의자 하부 진입 차단이 계속 유지되는지
4. 컴퓨터실 변형 키보드·의자가 정확히 4개씩인지와 시각 메쉬/AABB 정렬
5. 후방 책장·헤드셋함의 방 경계, 스폰, 이동 동선 간섭 여부
6. 두 맵 각각 3회 재빌드 및 상호 교차 전환
7. HUD 수량의 회차별 불변, 콘솔 예외·NaN·WebGL 오류 0건

스크린샷·콘솔 로그는 저장소 밖 AGY 아티팩트 디렉터리에 저장한다. GUI를 실행하지 못한 항목은 PASS로 추정하지 말고 미실행으로 보고한다.

## 8. 완료 보고 형식

```text
[AGY 단계 완료 보고]
단계: P1 — 대형 가구 배치 및 AABB 동기화

시작 상태:
- 브랜치/HEAD:
- 기존 변경 및 보존 확인:

변경 파일:
- 파일별 변경 요약:
- 허용 범위 밖 변경 여부:

시청각실:
- 피아노 부품·좌표·AABB:
- 무대 스폰 겹침:
- 펼쳐진 좌석 5개와 나머지 55개:
- 좌판 발판 및 통로:
- P0 회귀:

컴퓨터실:
- 변형 키보드 4개:
- 변형 의자 4개와 AABB 동기화:
- 후방 책장:
- 헤드셋함 및 헤드셋 수량:
- 스폰·중앙 통로·방 경계:

자동 검증:
- 명령별 종료 코드와 핵심 수치:
- 통합 검사 결과 또는 환경 제한:
- git diff --check:

브라우저 검증:
- 시청각실:
- 컴퓨터실:
- 3회 재빌드·교차 전환:
- 콘솔/WebGL:
- 저장소 밖 증거 경로:

종료 상태:
- git diff --stat:
- git status --short:
- 미완료/제한:
- P2 미진행 확인:
```

보고 후 즉시 멈춘다. 체크리스트에는 `Codex 검증 대기`까지만 기록하며 `PASS`는 Codex만 선언한다.
