# 신규 맵 5종 정식 통합 제안서

- 작성일: 2026-09-23
- 대상: index.html
- 상태: **권장안 A 적용 완료 — 자동화 및 브라우저 기본 회귀 통과**
- 선행 조건: 미술실·체육관·음악실·보건실·돌봄교실 Codex PASS
- 원칙: 이 문서를 승인하기 전에는 index.html을 수정하지 않는다.

## 1. 결론

신규 맵 5종은 현재 엔진에 type: module 맵으로 연결할 수 있다. 필요한 변경은 모듈 import, MAPS 등록, 컨텍스트 브리지, 준비 상태 판정, 빌드·cleanup 분기, 활성 맵 update 후크의 여섯 영역이다.

권장 방식은 **외부 ES 모듈 유지 방식**이다. 검증을 마친 maps/*.js를 그대로 사용하므로 중복 코드와 수동 복사 오류가 가장 적다.

단, 이 방식부터 배포 단위는 단일 index.html이 아니라 아래 파일을 포함한 폴더가 된다.

    index.html
    maps/
      art_room.js
      gymnasium.js
      music_room.js
      health_office.js
      care_room.js

Netlify Drop, GitHub Pages 등에는 상대 경로를 보존한 프로젝트 폴더를 배포해야 한다. file://로 index.html만 직접 여는 방식은 브라우저의 ES 모듈/CORS 정책 때문에 지원 대상으로 삼지 않는다.

## 2. 대안과 선택

### 권장안 A — 외부 ES 모듈 유지

- 장점: 검증된 모듈을 그대로 사용하며 유지보수와 독립 검사가 쉽다.
- 단점: 더 이상 index.html 단일 파일 배포가 아니다.
- 배포: 프로젝트 폴더 또는 최소 배포 묶음을 통째로 업로드한다.

### 대안 B — 신규 맵 코드를 index.html에 인라인 병합

- 장점: 기존 단일 파일 배포 방식을 유지할 수 있다.
- 단점: 모듈과 배포본 코드가 이중화되고 이후 수정 시 동기화 오류 가능성이 크다.
- 판단: 강한 단일 파일 요구가 있을 때만 선택한다.

이 제안서는 권장안 A를 기준으로 한다.

## 3. 실제 통합 지점

| 영역 | 현재 위치 | 변경 |
|---|---:|---|
| 모듈 import | index.html:735 이후 | 신규 맵 5종 import 추가 |
| 공통 컬렉션 | index.html:921 이후 | 기존 배열과 mapRoot 재사용 |
| 공통 헬퍼 | index.html:934 이후 | addBox, addCyl, addAABBCollider 재사용 |
| 방 외피 | index.html:1252 | buildRoomShell 주입 |
| 기믹 갱신 | index.html:2069 | 활성 module 맵 update 호출 추가 |
| 맵 레지스트리 | index.html:2078 | 신규 맵 5종 등록 |
| 준비 판정 | index.html:2084 | module 타입 허용 |
| 맵 빌드 | index.html:2147 | cleanup 및 module 빌드 분기 추가 |

## 4. 제안 변경

### 4.1 모듈 import

GLTFLoader import 바로 아래에 다섯 모듈의 메타데이터, build, update, cleanup export를 import한다.

### 4.2 컨텍스트 브리지

MAPS 선언 전에 아래 계약의 makeBuildContext()를 추가한다.

    function makeBuildContext(){
      return {
        THREE, mapRoot, ROOM_W, ROOM_D, WALL_H,
        setWallHeight:(height)=>{ WALL_H=height; },
        addBox, addCyl, canvasTex, lambert, addAABBCollider,
        samplables, colliders, refillZones,
        hiderSpawns, seekerSpawns, buildRoomShell
      };
    }

WALL_H는 값 복사이므로 모듈이 직접 수정하지 않는다. 벽 높이 변경은 반드시 setWallHeight를 통한다.

### 4.3 MAPS 등록

기존 네 맵은 그대로 유지하고 다음 다섯 항목을 type: module로 추가한다.

- art_room: ART_ROOM_MAP 및 미술실 생명주기
- gymnasium: GYMNASIUM_MAP 및 체육관 생명주기
- music_room: MUSIC_ROOM_MAP 및 음악실 생명주기
- health_office: HEALTH_OFFICE_MAP 및 보건실 생명주기
- care_room: CARE_ROOM_MAP 및 돌봄교실 생명주기

각 항목은 메타데이터를 펼치고 build, update, cleanup 함수를 바인딩한다.

### 4.4 준비 상태 판정

mapIsReady(id)는 canvas와 module을 즉시 준비 완료로 판정하고, 그 외 타입만 기존 glbBase64 검사로 보낸다.

    function mapIsReady(id){
      const m=MAPS[id];
      if(!m)return false;
      if(m.type===canvas||m.type===module)return true;
      return !!(m.glbBase64&&m.glbBase64.length>100);
    }

### 4.5 활성 모듈 기믹 update

기존 레거시 기믹 호출은 그대로 두고 updateMapGimmicks(dt) 마지막에 다음 후크를 추가한다.

    const activeDef=MAPS[currentMapId];
    if(activeDef?.type===module&&typeof activeDef.update===function){
      activeDef.update(makeBuildContext(),dt);
    }

### 4.6 buildActiveMap 분기

다음 순서를 지켜 최소 변경한다.

1. 다음 맵 def와 이전 맵 previousDef를 구한다.
2. 이전 맵이 module이면 cleanup(makeBuildContext())을 호출한다.
3. clearMap()을 호출한다.
4. canvas는 기존 def.build(), module은 def.build(makeBuildContext()), 나머지는 loadGLBMap(def)을 호출한다.
5. 성공 후 currentMapId를 변경한다.
6. 실패하면 해당 module cleanup, clearMap, 교실 build 순으로 복구한다.

cleanup은 반드시 clearMap()보다 먼저 호출한다.

## 5. 변경하지 않는 영역

- 기존 교실·과학실·급식실·도서관 빌드 함수
- Firebase 데이터 구조와 방 생성·입장 흐름
- 역할 배정, 감염 모드, 검거, 스포이드 및 이동 로직
- 기존 레거시 맵 기믹 호출 순서
- clearMap()의 기존 컬렉션 초기화 동작

## 6. 위험 요소와 대응

### 배포 누락

- 위험: maps/*.js가 빠지면 정적 import 단계에서 전체 게임 스크립트가 시작되지 않는다.
- 대응: 배포 검사에 다섯 모듈의 HTTP 200 확인을 포함한다.

### file:// 실행 불가

- 위험: 브라우저가 로컬 ES 모듈 import를 차단할 수 있다.
- 대응: 로컬 HTTP 서버 또는 정적 호스팅을 공식 실행 방식으로 문서화한다.

### 모듈 build 예외

- 위험: 절반만 생성된 맵과 리소스가 남을 수 있다.
- 대응: catch에서 해당 모듈 cleanup, clearMap(), 교실 fallback 순으로 복구한다.

### 이전 맵 동적 리소스 잔존

- 위험: 기차와 펄스 머티리얼 같은 동적 상태가 다음 맵에 남을 수 있다.
- 대응: 이전 module cleanup을 clearMap()보다 먼저 호출한다.

## 7. 적용 후 자동 검사

- [x] 다섯 맵 모듈 node --check
- [x] node scripts/check_health_office.mjs
- [x] node scripts/check_care_room.mjs
- [x] git diff --check
- [x] index.html 변경 범위가 승인된 여섯 영역에 한정되는지 확인
- [x] 다섯 모듈 URL이 모두 HTTP 200인지 확인

## 8. 적용 후 브라우저 회귀 검사

- [x] 타이틀 화면이 오류 없이 표시됨
- [x] 연습 모드에 기존 4개 및 신규 5개 맵 카드가 표시됨
- [x] 신규 5개 맵이 준비중이 아닌 선택 가능 상태임
- [ ] 각 신규 맵에서 지우개 20개·술래 6개 스폰이 적용됨
- [ ] 기존 4개 맵과 신규 5개 맵을 순차 전환해 이전 맵 잔존물이 없음
- [ ] 돌봄교실 기차가 이동하고 다른 맵 전환 후 제거됨
- [ ] 체육관 구름판과 음악실 메트로놈의 시각 기믹이 해당 맵에서만 동작함
- [ ] 보건실·미술실의 보류 기능이 구현된 것처럼 동작하지 않음
- [ ] 스포이드, 이동, 점프, 검거, 리필존이 기존 맵과 신규 맵에서 동작함
- [ ] 베이직·감염 모드 시작, 종료 및 결과 화면에 회귀가 없음
- [ ] 모바일 가로 화면에서 맵 선택 및 게임 진입이 가능함

## 9. 롤백

통합 적용을 되돌릴 때는 승인된 통합 커밋 하나만 revert한다. 수동 롤백이 필요하면 다음 변경을 역순으로 제거한다.

1. buildActiveMap의 module 분기와 cleanup 호출
2. updateMapGimmicks의 module update 후크
3. mapIsReady의 module 허용 분기
4. MAPS의 신규 5개 항목
5. makeBuildContext
6. 신규 맵 import 다섯 묶음

모듈 파일은 독립 프리뷰와 기록 보존을 위해 삭제하지 않는다.

## 10. 승인 게이트

- [x] 신규 맵 5종 Codex PASS
- [x] 실제 index.html 구조에 맞춘 통합안 작성
- [x] 기존 맵을 유지하는 최소 변경 범위 정의
- [x] 롤백 및 회귀 테스트 계획 작성
- [x] Codex 제안서 검토
- [x] 사용자 배포 방식 선택: 외부 모듈 유지
- [x] 사용자 index.html 수정 승인
- [x] 승인 후 통합 적용 및 자동화·브라우저 기본 회귀 테스트
- [ ] 온라인 다중 접속, 베이직·감염 라운드 및 실제 모바일 현장 회귀 테스트
