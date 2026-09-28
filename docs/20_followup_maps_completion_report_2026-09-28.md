# 신규 공간 3종 후속 작업 완료 보고 — 2026-09-28

## 1. 개요

돌봄교실 장난감 기차 교정 이후 시청각실, 컴퓨터실, 초등 도서실을 독립 Three.js 모듈로 구현하고 정식 게임에 통합했다. 작업은 단계별 AGY 구현과 Codex 독립 검증 방식으로 진행했으며, 각 단계의 승인 전에는 다음 단계와 배포 통합을 시작하지 않았다.

- 기준 브랜치: `main`
- 시작 기준 커밋: `51424ea7c5929ef623f7aa3c930f4bdd74ce01b2`
- 완료일: 2026-09-28
- 정식 배포 단위: 저장소 루트 `index.html`과 `maps/` 디렉터리

## 2. 단계별 결과

| 단계 | 결과 | 핵심 검증 |
|---|---|---|
| 1. 돌봄교실 기차 궤적 교정 | PASS | 자동 검사 21건, 2바퀴 이상 육안 검증 |
| 2. 시청각실 `av_room` | PASS | 자동 검사 23건, 재빌드·교차 전환·브라우저 검증 |
| 3. 컴퓨터실 `computer_lab` | PASS | 자동 검사 32건, PC 24석·마지막 행·3회 재빌드 검증 |
| 4. 초등 도서실 `library_elem` | PASS | 자동 검사 49건, 빈 슬롯 10개·CanvasTexture 수명주기·8개 맵 회귀 검증 |
| 5. 문서 및 통합 준비 | PASS | 통합 일괄 검사 29건, 통합안과 선택적 롤백 절차 검증 |
| 6. 정식 통합 | PASS | 최신 `index.html`에 신규 import와 `MAPS` 등록, 실제 브라우저 재진입·왕복 검증 |

## 3. 신규 맵 구현 요약

### 시청각실

- 70×25 무대와 롤스크린 뒤 은신 통로
- 6단 스타디움과 접이식 의자 60석
- 빔프로젝터 광선 펄스 기믹
- 지우개 20개·술래 6개 스폰, 충돌체 28개, samplables 151개

### 컴퓨터실

- 폭 18 units 중앙 통로
- 좌우 12석씩 PC 24석과 마지막 4행 보존
- 모니터·본체·케이블·바퀴의자·교사 연구대·스크린
- PC 및 LAN LED 기믹
- 지우개 20개·술래 6개 스폰, 충돌체 126개, samplables 271개

### 초등 도서실

- 낮은 서가 5개동, 책등 181개, 접근 가능한 빈 슬롯 10개
- 온돌 좌식 존, 일반 열람석 4세트, 창가 카운터와 하이체어 5개
- 무인 대출·반납기 2대와 스캐너 애니메이션
- CanvasTexture 3종 추적 및 cleanup dispose
- 지우개 20개·술래 6개 스폰, 충돌체 81개, samplables 364개

## 4. 정식 통합 및 배포 결정

신규 맵 3종은 `index.html`의 ES module import 구역과 `MAPS` 레지스트리에 등록했다. 기존 `mapIsReady()`, `buildActiveMap()`, update 및 cleanup 경로가 `module` 계약을 지원하므로 별도 UI 분기 없이 로비와 연습 모드에 반영된다.

구형 `index (배포용).html`, `primary_data/index (배포용).html` 및 기존 ZIP은 module build/update/cleanup 실행 경로가 없는 레거시 산출물이다. 신규 맵 등록만 추가하면 카드가 비활성화되고 실제 맵이 실행되지 않으므로 이 파일들은 원상 유지했다.

앞으로는 다음 구조를 함께 정적 호스팅한다.

```text
index.html
maps/
  art_room.js
  gymnasium.js
  music_room.js
  health_office.js
  care_room.js
  av_room.js
  computer_lab.js
  library_elem.js
```

`index.html`만 단독 복사하거나 `file://`로 실행하지 않는다.

## 5. 검증 결과

- `node scripts/check_followup_maps.mjs`: 29건 통과, 0건 실패
- `node scripts/check_av_room.mjs`: 23건 통과
- `node scripts/check_computer_lab.mjs`: 32건 통과
- `node scripts/check_library_elem.mjs`: 49건 통과
- `node scripts/check_care_room.mjs`: 21건 통과
- `python scripts/98_check_preview_script.py`: 통과
- `git diff --check`: 통과
- 실제 브라우저에서 신규 맵 3종 각각 3회 재진입 성공
- 신규 3종에서 기존 교실로 왕복 후 잔존물·중복·JavaScript·WebGL 오류 0건

증거 스크린샷과 콘솔 덤프는 저장소 외부 AGY 아티팩트 디렉터리에 보관했다.

## 6. Firebase 규칙 호환성 검토

공유 Realtime Database 규칙 기준으로 교실 대소동의 핵심 게임 흐름은 조건부 호환으로 판정했다.

- `rooms/{4자리 코드}` 아래 실제 사용 항목은 `meta`, `players`, `pos`, `presence`, `kicks`, `stats`뿐이다.
- 루트 `presence/{uid}` 쓰기는 정상 생성 UID와 `online` 포함 데이터에서 허용된다.
- `onDisconnect().remove()`는 삭제이므로 validate 조건과 충돌하지 않는다.
- 루트 REST 진단 `/.json?shallow=true`는 거부되어 정상 연결에는 영향이 없지만 장애 안내가 부정확해질 수 있다.
- 인증 없는 전체 방 읽기·쓰기는 기능상 동작하지만 보안 격리는 약하므로 향후 별도 보강 대상이다.

실제 Firebase 규칙과 데이터는 변경하지 않았다.

## 7. 별도 후속 아이디어

학교 공간, 과학 실험 도구, 역사 유물·유적 등을 거대화한 학습형 장애물·협동 게임 아이디어는 본 프로젝트와 분리해 `future_projects/learning_adventure_game/README.md`에 기록했다. 현재 게임 구현 범위에는 포함하지 않는다.

## 8. 남은 현장 검증

- 실제 학교 네트워크에서 호스트 1명과 학생 2명 이상의 동시 접속
- 신규 맵 선택 및 `mapId` 동기화
- 신규 맵에서 위치·스포이드·검거·결과·재입장 흐름
- 새 Firebase 규칙 적용 후 방 생성부터 오래된 방 정리까지의 전체 흐름
- 학교 태블릿·저사양 기기의 프레임과 메모리 관찰

위 항목은 코드·단일 브라우저 검증과 구분되는 운영 환경 검증이며, 실패 시 별도 이슈로 기록한다.
