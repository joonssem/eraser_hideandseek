# AGY 작업 지시서 01 — 돌봄교실 장난감 기차 궤적 수정

- 작성일: 2026-09-23
- 실행 담당: AGY
- 검증 담당: Codex
- 저장소: `D:\Projects\eraser_hideandseek`
- 기준 브랜치: `main`
- 기준 커밋: `cd38d70`
- 작업 상태: 완료 — Codex PASS (2026-09-23)
- 상위 체크리스트: `docs/12_agy_train_fix_and_new_spaces_checklist.md`

## 1. 이번 작업의 범위

이번 세션에서는 **돌봄교실 장난감 기차의 순간이동 및 게걸음 주행 버그만 수정**한다.

신규 공간 3종(`av_room`, `computer_lab`, `library_elem`)은 구현하지 않는다. `index.html`, `maps/preview.html`, 문서 및 다른 맵도 수정하지 않는다. 검증 보강을 위해 다른 파일 변경이 불가피하다고 판단되면 먼저 이유를 보고하고 멈춘다.

## 2. 시작 전 필수 확인

아래 순서대로 실행하고 결과를 기록한다.

```powershell
Set-Location -LiteralPath 'D:\Projects\eraser_hideandseek'
git status --short --branch
git rev-parse HEAD
```

주의 사항:

- 현재 로컬에는 사용자가 만든 미추적 문서·분석 결과·스크립트가 있다. 삭제, 이동, 덮어쓰기, `git clean`, `git reset`, stash를 하지 않는다.
- 이미 `origin/main`의 `cd38d70`까지 pull된 상태다. 다시 pull하거나 checkout하지 않는다.
- commit, push, merge를 하지 않는다.
- 기존 사용자 변경을 되돌리지 않는다.

다음 파일을 UTF-8로 모두 읽고 실제 코드와 문서가 일치하는지 확인한다.

- `docs/10_care_room_train_bug_analysis_and_fix_plan.md`
- `docs/12_agy_train_fix_and_new_spaces_checklist.md`
- `maps/care_room.js`
- `scripts/95_verify_care_room_bug.py`
- `scripts/96_verify_corrected_track.py`
- `scripts/check_care_room.mjs`

## 3. 확인된 결함

### 3.1 순간이동

`getTrackPoint(dist)`의 원호 구간 삼각함수 위상 및 Z축 부호가 직선 구간 끝점과 연결되지 않는다. 세그먼트 경계에서 Z좌표가 최대 36 units 급변한다.

### 3.2 게걸음 주행

함수가 반환하는 `angle`과 실제 이동 벡터의 Three.js yaw(`atan2(dx, dz)`) 사이에 약 -90° 오차가 있다.

## 4. 구현 요구사항

- [ ] `maps/care_room.js`의 현재 `getTrackPoint(dist)`와 기차 모델의 실제 전방축을 먼저 확인한다.
- [ ] 문서 10의 `correctedGetTrackPoint` 수식을 현재 함수에 맞게 반영한다.
- [ ] 북측 직선 → 서측 반원 → 남측 직선 → 동측 반원 → 북측 직선의 모든 경계에서 위치가 연속이어야 한다.
- [ ] 실제 이동 벡터와 반환 yaw가 일치해야 한다.
- [ ] `((dist % total) + total) % total` 형태의 거리 정규화로 음수와 전체 길이 초과 입력을 안전하게 처리한다.
- [ ] 침목 배치와 기차 애니메이션이 같은 교정된 궤적 함수를 사용해야 한다.
- [ ] 기차 속도, 외형, 충돌체, 스폰, cleanup, export 계약은 변경하지 않는다.
- [ ] 불필요한 리팩터링이나 포매팅 변경을 하지 않는다.
- [ ] 최종 변경 범위는 원칙적으로 `maps/care_room.js` 한 파일이어야 한다.

## 5. 필수 검증

아래 명령을 실행하고 **요약이 아닌 실제 결과**를 완료 보고에 포함한다.

```powershell
node --check maps/care_room.js
python scripts/95_verify_care_room_bug.py
python scripts/96_verify_corrected_track.py
node scripts/check_care_room.mjs
git diff --check
git diff -- maps/care_room.js
git status --short
```

판정 기준:

- 정적 문법 오류 0건
- 교정 궤적 1,000개 표본에서 비정상 순간이동 0건
- 최대 1스텝 변위가 약 `0.1771 units`
- 최대 yaw 오차가 약 `0.2819°` 이내
- 기존 돌봄교실 정적 검사 통과
- `maps/care_room.js` 외 의도하지 않은 변경 없음

브라우저 프리뷰를 직접 실행할 수 있다면 다음도 확인한다.

- 최소 2바퀴 동안 순간이동 없음
- 기관차가 실제 진행 방향을 향하며 게걸음·역주행 없음
- 침목과 기차가 같은 선로를 따름
- 다른 맵으로 전환 후 돌아왔을 때 기차 중복 없음
- 콘솔 오류 없음

프리뷰 실행이 불가능하면 통과했다고 추정하지 말고 `미실행`과 이유를 정확히 보고한다.

## 6. 금지 사항

- `index.html` 및 `index (배포용).html` 수정 금지
- `maps/preview.html` 수정 금지
- 신규 맵 구현 시작 금지
- 사용자 미추적 파일 삭제·이동·정리 금지
- `git clean`, `git reset`, 강제 checkout 금지
- commit, push, merge 금지
- 테스트 결과를 실행하지 않고 통과로 표기 금지

## 7. 완료 후 행동

수정과 검증이 끝나면 아래 형식으로 보고하고 **즉시 멈춘다**. Codex의 `PASS` 전에는 신규 공간 작업을 시작하지 않는다.

```text
[AGY 단계 완료 보고]
단계: 1단계 — 돌봄교실 장난감 기차 궤적 수정
기준 커밋: cd38d70

완료 체크:
- [x] ...

변경 파일:
- maps/care_room.js

변경 요약:
- ...

실행한 검증과 실제 결과:
- node --check maps/care_room.js
  결과: ...
- python scripts/95_verify_care_room_bug.py
  결과: ...
- python scripts/96_verify_corrected_track.py
  결과: ...
- node scripts/check_care_room.mjs
  결과: ...
- git diff --check
  결과: ...

육안 검증:
- 실행 여부: 실행 / 미실행
- 결과 또는 미실행 이유: ...

미완료/제한:
- ...

Codex가 확인할 핵심:
- 네 세그먼트 및 루프 경계 연속성
- 이동 벡터와 yaw 일치
- 의도하지 않은 변경 여부
```
