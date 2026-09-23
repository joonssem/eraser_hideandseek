# AGY 작업 지시서 03 — 컴퓨터실 `computer_lab` 독립 모듈 구현

- 작성일: 2026-09-23
- 실행 담당: AGY
- 검증 담당: Codex
- 저장소: `D:\Projects\eraser_hideandseek`
- 기준 브랜치: `main`
- 기준 상태: `cd38d70` + 1·2단계 로컬 변경
- 작업 상태: AGY 재작업 완료 보고 접수 — Codex 검증 대기 (2026-09-23)
- 선행 조건: 2단계 시청각실 Codex PASS
- 상위 체크리스트: `docs/12_agy_train_fix_and_new_spaces_checklist.md`

## 1. 이번 작업의 범위

이번 세션에서는 컴퓨터실 `computer_lab`을 독립 맵 모듈로 구현하고 자동 검사와 독립 프리뷰에 연결한다.

허용되는 변경:

- 신규 `maps/computer_lab.js`
- 신규 `scripts/check_computer_lab.mjs`
- 필요시 컴퓨터실 좌표·프리뷰 문법을 검증하는 최소 보조 스크립트
- `maps/preview.html`에 `computer_lab`을 등록하는 최소 변경
- `maps/README.md` 구현 목록의 최소 변경

수정 금지:

- `index.html`, `index (배포용).html`
- `maps/care_room.js`, `maps/av_room.js` 및 기존 맵 모듈
- 기존 검사 기준 완화
- `library_elem` 구현 시작

## 2. 시작 전 필수 확인

```powershell
Set-Location -LiteralPath 'D:\Projects\eraser_hideandseek'
git status --short --branch
git rev-parse HEAD
git diff -- maps/care_room.js maps/av_room.js maps/preview.html maps/README.md
```

- 현재 미추적 문서·검증 자료와 1·2단계 변경을 보존한다.
- pull, reset, clean, stash, checkout, commit, push, merge를 하지 않는다.
- 아래 파일을 UTF-8로 처음부터 끝까지 읽는다.
  - `docs/11_additional_map_ideas_and_level_design.md`
  - `docs/12_agy_train_fix_and_new_spaces_checklist.md`
  - `intermediate_results/new_maps_specification.json`
  - `maps/README.md`
  - `maps/art_room.js`
  - `maps/av_room.js`
  - `maps/preview.html`
  - `scripts/check_av_room.mjs`

## 3. 모듈 계약

`maps/computer_lab.js`는 다음 네 항목을 export한다.

```javascript
export const COMPUTER_LAB_MAP = { id: "computer_lab", name: "컴퓨터실", icon: "🖥️" };
export function buildComputerLab(ctx) {}
export function updateComputerLabGimmicks(ctx, dt) {}
export function cleanupComputerLab(ctx) {}
```

- 모든 의존성은 `ctx`로 주입받는다.
- `setWallHeight(26)`을 사용하고 `ctx.WALL_H`를 직접 변경하지 않는다.
- 엔진 공통 규격 `ROOM_W=120`, `ROOM_D=90` 안에서 구현한다.
- top-level DOM 조작, 타이머, 외부 전역 접근을 만들지 않는다.
- 외부 이미지·GLB·폰트 없이 기본 지오메트리와 Canvas 텍스처만 사용한다.

## 4. 공간 배치 요구사항

### 4.1 학생 PC 구역

- [ ] 학생용 PC 좌석을 정확히 24개 구현한다.
- [ ] 좌측 12석과 우측 12석으로 나눈다.
- [ ] 각 그룹은 4열×3행 또는 실제 공간에 맞는 동등한 12석 격자로 배치한다.
- [ ] 중앙 통로는 X축 기준 최소 폭 18 units를 끝에서 끝까지 유지한다. 통로 경계는 원칙적으로 `x=-9`와 `x=+9` 바깥에 둔다.
- [ ] 각 좌석에 갈색 목재 책상, 16:9 슬림 모니터, 스탠드, 타워형 본체, 키보드, 마우스패드, 회전 바퀴의자를 식별 가능하게 구현한다.
- [ ] PC 좌석 24개가 단순 장식 복제로 끝나지 않도록 좌우 통로 및 행간 이동 공간을 확보한다.

### 4.2 은신 포인트

- [ ] 모니터 뒷면 스탠드 뒤에 시야 차폐 공간을 둔다.
- [ ] 책상 아래 타워 본체 뒤 또는 옆의 케이블 뭉치를 절차적 지오메트리로 표현한다.
- [ ] 키보드 키캡 사이 은신 콘셉트를 작은 반복 키캡으로 시각화한다.
- [ ] 회전 의자의 오발 다리와 좌판 하단이 식별 가능해야 한다.
- [ ] 은신 공간을 통짜 책상 AABB로 모두 봉쇄하지 않는다. 상판·다리·본체 충돌을 분리해 책상 아래 접근성을 보존한다.
- [ ] 작은 키캡·케이블·마우스는 원칙적으로 `collide: false, sample: true`로 둔다.

### 4.3 교사 구역과 주요 설비

- [ ] 전면 교사석과 교탁을 구현한다.
- [ ] 전면 벽에 폭 45, 높이 18을 기준으로 프로젝터 스크린을 둔다.
- [ ] 천장 프로젝터를 `(0, 22, -15)` 부근에 배치한다.
- [ ] 교사 구역이 중앙 통로를 막지 않도록 한다.
- [ ] 권장 팔레트: 책상 `#6e4727`, 모니터 `#1f1f1f`, 본체 `#2e2e2e`, 키캡 `#111111`, 마우스패드 `#1d3557`, 바닥 `#d1ccc0`.

## 5. 충돌·성능·생명주기 요구사항

- [ ] 책상 상판, 다리, PC 본체의 충돌체를 실제 형상과 유사하게 분리한다.
- [ ] 중앙 통로 폭 18 units 안에 어떤 AABB도 침범하지 않는다. 단, 전면 교사 구역처럼 통로 종단 바깥은 별도 판정한다.
- [ ] 의자는 지나치게 복잡한 개별 충돌체 대신 접근성과 성능을 함께 만족시키는 최소 충돌 구조를 사용한다.
- [ ] 동일 지오메트리·재질은 가능한 범위에서 공유한다.
- [ ] 동적 기믹이 없다면 update는 안전한 noop으로 구현한다.
- [ ] cleanup 후 update 호출이 안전해야 하며, 반복 빌드에서 수량이 증가하지 않아야 한다.
- [ ] 구현하지 않은 회전 의자 물리나 케이블 애니메이션을 완료로 주장하지 않는다.

## 6. 스폰 계약

- [ ] 지우개 스폰 20개, 술래 스폰 6개를 정확히 등록한다.
- [ ] 모두 `new THREE.Vector3(x, 0, z)` 형식이며 방 경계 안에 있어야 한다.
- [ ] 모든 스폰은 AABB 내부가 아니어야 한다.
- [ ] 술래 스폰은 중앙 통로의 전·중·후방과 좌우 외곽 접근점에 분산한다.
- [ ] 지우개 스폰은 모니터 뒤, 책상 옆, 의자 주변, 외곽 통로 등 다양한 시작 지점을 제공하되 충돌체 안에는 두지 않는다.

## 7. 프리뷰 연결

`maps/preview.html`에 다음 최소 변경만 수행한다.

- `computer_lab.js`의 4개 export import
- 선택 옵션 `🖥️ 컴퓨터실 (computer_lab)` 추가
- `AVAILABLE_MAPS.computer_lab` 등록
- 기존 6개 맵의 순서·동작·cleanup 계약 보존

프리뷰 HUD에서 다음 값이 표시되어야 한다.

- 벽 높이 26
- 지우개 스폰 20
- 술래 스폰 6
- 충돌체와 samplables가 반복 재빌드 전후 동일

## 8. 자동 검사 `scripts/check_computer_lab.mjs`

실제 빌드 결과를 대상으로 최소 다음을 검사한다.

- 4종 export 및 메타데이터
- `setWallHeight(26)`
- PC 좌석 24개, 좌우 각 12개
- 책상·모니터·본체·키보드·의자 구성 수량
- 중앙 통로 최소 폭 18 units 및 AABB 침범 0건
- 지우개 20개, 술래 6개, 전부 `y=0`
- 26개 스폰과 AABB의 XZ 겹침 0건
- 모든 주요 오브젝트와 스폰이 방 경계 안에 위치함
- cleanup 이후 안전한 update
- 3회 반복 빌드·cleanup 수치 일치
- 기존 6개 맵을 포함한 7개 맵 교차 전환 성공

검사가 소스 문자열만 세어 거짓 통과하지 않도록 mock THREE 빌드 결과의 위치·형상·수량을 검사한다.

## 9. 필수 검증 명령

```powershell
node --check maps/computer_lab.js
node scripts/check_computer_lab.mjs
python scripts/98_check_preview_script.py
node scripts/check_av_room.mjs
node scripts/check_care_room.mjs
git diff --check
git diff -- maps/computer_lab.js maps/preview.html maps/README.md scripts/check_computer_lab.mjs
git diff -- index.html 'index (배포용).html' maps/care_room.js maps/av_room.js
git status --short
```

기존 `maps/care_room.js`에는 1단계 승인 변경이 있으므로 마지막 diff는 **새로운 추가 변경이 없는지** 기준 상태와 대조한다.

## 10. 육안 검증

로컬 HTTP 서버에서 `maps/preview.html`을 열고 다음을 확인한다.

- [ ] 24개 PC 좌석이 좌우 12개씩 명확히 구분됨
- [ ] 중앙 통로가 전후로 막힘없이 이어짐
- [ ] 모니터, 타워 본체, 키보드, 케이블, 바퀴의자가 식별 가능함
- [ ] 모니터 뒤·책상 아래·의자 하단 은신 공간이 시각적으로 열려 있음
- [ ] 스폰 마커가 충돌체 와이어프레임 내부에 없음
- [ ] 쿼터·상공·전면 뷰에서 오브젝트가 방 경계를 넘지 않음
- [ ] cleanup·재빌드 3회 후 HUD 수량 및 화면이 동일함
- [ ] `av_room`과 `care_room`으로 왕복 전환해도 오류·중복이 없음

GUI를 사용할 수 없으면 통과로 추정하지 말고 `미실행`과 이유를 보고한다.

## 11. 완료 보고 후 정지

```text
[AGY 단계 완료 보고]
단계: 3단계 — 컴퓨터실 computer_lab 독립 모듈
기준: cd38d70 + 1·2단계 로컬 변경

완료 체크:
- [x] ...

변경 파일:
- maps/computer_lab.js
- maps/preview.html
- maps/README.md
- scripts/check_computer_lab.mjs
- (추가 보조 스크립트가 있다면 전부 기재)

핵심 수량:
- 전체 PC 좌석: /24
- 좌측/우측: /12, /12
- 지우개 스폰: /20
- 술래 스폰: /6
- 충돌체:
- samplables:

중앙 통로:
- 측정 폭:
- 침범 AABB 수:

실행한 검증과 실제 결과:
- 명령:
  결과:

육안 검증:
- 실행 여부:
- 결과 또는 미실행 이유:

미완료/제한:
- ...

Codex가 확인할 핵심:
- 24석 및 좌우 12석 배치
- 중앙 통로 18 units
- 은신 공간 접근성과 충돌 분리
- 스폰 안전성
- 기존 맵 회귀와 cleanup
```

보고 후 즉시 멈추고 Codex의 `PASS`를 기다린다. `library_elem`을 시작하지 않는다.

## 12. Codex 검증에서 발견된 재작업 항목

현재 3단계 판정은 **FAIL**이다. 최초 로드에서는 24개 PC 좌석이 모두 렌더링되지만, 실제 브라우저에서 `맵 클린업 & 재빌드 테스트`를 반복하면 마지막 행의 책상·모니터·의자 메쉬가 일부 또는 전부 사라지고 AABB 와이어프레임만 남는 현상이 재현되었다.

재작업 순서:

1. `maps/preview.html`의 `mapRoot.children.pop()` 직접 조작, 부모 참조 해제, 공유 material/geometry 중복 dispose 가능성을 조사한다.
2. Three.js 객체는 정상적인 `remove()` 경로로 부모 관계를 해제하고, 공유 리소스를 중복 dispose하지 않도록 정리 생명주기를 수정한다.
3. 동일 브라우저 컨텍스트에서 컴퓨터실 재빌드 3회 후에도 24개 PC 좌석의 실물 메쉬가 전부 유지되는지 확인한다.
4. `av_room`과 `care_room`을 왕복한 뒤 컴퓨터실로 돌아와 동일 결과를 확인한다.
5. 이 결함이 해결된 뒤 아래 모니터 화면 다양화 작업을 적용한다.

### 모니터 화면 다양화 추가 요구사항

- [ ] 모니터 24대를 `켜짐 18대 + 절전 3대 + 꺼짐 3대`로 구성한다.
- [ ] 켜진 화면은 코딩, 한글 문서, 그림판, 교육용 게임, 인터넷 학습 페이지, 바탕화면의 6종으로 구성하고 각 유형을 3대씩 배정한다.
- [ ] 외부 이미지 없이 `canvasTex()`로 6종 화면 텍스처를 한 번씩 생성해 공유한다.
- [ ] 켜진 화면에는 실제 PointLight 24개를 추가하지 않고 emissive 계열 재질로 발광감을 표현한다.
- [ ] 절전 화면은 어두운 남색과 작은 시계/안내 표시, 꺼진 화면은 검은 반사 화면으로 구분한다.
- [ ] 최대 2~3대에만 1~2초 이상의 느린 화면 전환 또는 커서 깜빡임을 적용한다.
- [ ] 강한 점멸이나 빠른 전환을 사용하지 않는다.
- [ ] 동적 Canvas 텍스처와 타이머를 사용하면 `cleanupComputerLab()`에서 해제한다.
- [ ] 재빌드 3회 및 교차 전환 후 화면 유형별 수량과 전체 모니터 24대가 유지되는지 자동·육안 검증한다.
- [ ] 밝은 화면의 역광 노출, 검은 화면의 위장 효과를 프리뷰에서 확인하고 보고한다.

## 13. AGY 재작업 완료 보고 기록 (미검증)

> 아래 내용은 2026-09-23 AGY가 제출한 결과를 기록한 것이다. 오늘은 작업 종료 요청에 따라 Codex의 독립 재실행 및 브라우저 육안 검증을 수행하지 않았다. 따라서 이 기록은 `PASS` 판정이 아니라 **검증 대기 상태**다.

### 보고된 근본 원인

1. `computer_lab.js`의 바퀴의자 가스쇼바 생성부에서 `addCyl` 인자 순서가 잘못되어 숫자 `0.8`이 material로 전달되고 X 좌표에 material 객체가 들어갔다.
2. 이 비정상 메쉬가 NaN 좌표와 유효하지 않은 material을 가진 채 생성되었고, 프리뷰 정리 중 `obj.material.dispose()` 호출에서 예외가 발생했다.
3. `mapRoot.children.pop()` 직접 조작 때문에 부모 참조 해제와 Three.js 제거 이벤트가 누락됐으며, 예외가 발생한 시점에 마지막 PC 행의 실물 메쉬만 제거된 채 새 빌드가 중단됐다.
4. 공유 material과 geometry가 모듈 cleanup 및 프리뷰 정리 양쪽에서 중복 dispose될 위험이 있었다.

### 보고된 수정 내용

- `addCyl(0.2, 0.8, chairFrameMat, cx, 0.8, chairZ, options)` 형태로 호출 시그니처를 교정했다.
- 비정상 NaN 충돌체 24개를 제거해 컴퓨터실 충돌체 수가 150개에서 126개로 정리됐다고 보고했다.
- `cleanupComputerLab()`에서 `Set`을 사용해 공유 리소스 중복 dispose를 방지했다.
- `maps/preview.html`에 `clearThreeGroup(group)`을 추가해 `group.remove(obj)` 기반 부모 해제, 하위 그룹 재귀 정리, geometry/material 중복 dispose 방지, dispose 함수 타입 검증을 통합했다고 보고했다.
- `scripts/check_computer_lab.mjs`에 부모 추적, material 타입 검사, NaN 좌표 검사, 동일 프리뷰 컨텍스트 3회 반복 재빌드, 마지막 행 메쉬 보존, 기존 맵 왕복 회귀 검사를 추가했다고 보고했다.

### AGY가 보고한 검증 결과

- `node scripts/check_computer_lab.mjs`: 32건 통과, 0건 실패
- 동일 컨텍스트 3회 반복 후 메쉬 398개 및 충돌체 126개 유지
- 각 반복에서 책상·모니터·본체·의자 각각 24개 유지
- 마지막 4행의 책상·모니터·의자 각각 6/6 유지
- `computer_lab ↔ av_room ↔ care_room` 7단계 왕복 전환 성공
- 전체 7개 맵 14단계 교차 전환 성공
- `node --check maps/computer_lab.js`: 통과 보고
- `python scripts/98_check_preview_script.py`: 통과 보고
- `node scripts/check_av_room.mjs`: 23건 통과 보고
- `node scripts/check_care_room.mjs`: 21건 통과 보고
- `git diff --check`: 통과 보고
- 배포 HTML 2종, `maps/av_room.js`, 승인된 1단계 이후의 `maps/care_room.js` 추가 변경 없음 보고

### 다음 작업일 검증 항목

- [ ] 위 명령을 Codex가 독립적으로 재실행한다.
- [ ] 브라우저 최초 로드에서 PC 24석을 확인한다.
- [ ] 동일 화면에서 재빌드 버튼을 3회 누르고 마지막 행을 포함한 24석 메쉬 보존을 확인한다.
- [ ] 시청각실·돌봄교실 왕복 후 컴퓨터실 복귀 상태를 확인한다.
- [ ] 콘솔 오류와 NaN 좌표·비정상 material이 없는지 확인한다.
- [ ] 검증 통과 후에만 3단계를 `Codex PASS`로 변경한다.
