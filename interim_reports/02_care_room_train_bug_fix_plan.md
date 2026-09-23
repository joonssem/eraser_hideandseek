# 돌봄교실 장난감 기차 버그 정밀 분석 및 수정 계획서 (Interim Report #02 - Ver 2.0 최신화)

- **문서 번호**: IR-20260923-CARE-ROOM-TRAIN-02
- **프로젝트 명**: 교실 대소동: 사라진 지우개 찾기 ver2.0 (`eraser_hideandseek`)
- **작성 일자**: 2026년 9월 23일 (GitHub 최신 커밋 `cd38d70` 풀링 후 실코드 동기화)
- **책임자**: Lead Scientist & Technical Owner
- **상태**: 실코드 분석 완료 및 수학적 원인 100% 규명 (Ready for Patch)
- **연관 파일 및 스크립트**:
  - 실제 대상 코드: [`maps/care_room.js#L26-L87`](file:///D:/Projects/eraser_hideandseek/maps/care_room.js#L26-L87)
  - 버그 수치 검증 스크립트: [`scripts/95_verify_care_room_bug.py`](file:///D:/Projects/eraser_hideandseek/scripts/95_verify_care_room_bug.py)
  - 궤적 시뮬레이션: [`scripts/92_simulate_train_trajectory.py`](file:///D:/Projects/eraser_hideandseek/scripts/92_simulate_train_trajectory.py)
  - 이전 분석 보고서: [`interim_reports/01_html_analysis_report.md`](file:///D:/Projects/eraser_hideandseek/interim_reports/01_html_analysis_report.md)

---

## 1. 최신 코드 반영 배경

GitHub 원격 저장소(`origin/main`, 커밋 `cd38d70 feat: integrate five modular maps`)를 `git pull`하여 최신 모듈형 맵 소스코드를 통합하였습니다.
실제 [`maps/care_room.js`](file:///D:/Projects/eraser_hideandseek/maps/care_room.js)의 기차 주행 알고리즘(`getTrackPoint`)을 정밀 수학 검증한 결과, 사용자가 보고한 두 가지 버그의 정확한 코드 결함 위치를 특정하였습니다.

---

## 2. 실코드 기반 기술적 결함 원인 규명

### 🚨 [결함 1] 중간에 기차가 사라지고 다른 곳에 나타남 (Z축 36 유닛 대도약 순간이동)

[`maps/care_room.js`](file:///D:/Projects/eraser_hideandseek/maps/care_room.js)의 45~87행에 위치한 `getTrackPoint(dist)` 구현체는 4개의 세그먼트(북측 직선 $\to$ 서측 반원 $\to$ 남측 직선 $\to$ 동측 반원)로 분할되어 있습니다.
그러나 원호 구간의 위상 각도(`phi`)와 Z축 부호 정의 오류로 인해 **매 세그먼트 전이 시점마다 Z축으로 36 units의 불연속 순간이동**이 발생하고 있었습니다:

```
[수치 검증 결과 - scripts/95_verify_care_room_bug.py]
1. 세그먼트 1(북측 직선) 끝점:  x = -16.000, z = -4.000
   세그먼트 2(서측 반원) 시작점: x = -16.000, z = +32.000  ==> [🚨 36 units 순간이동!]

2. 세그먼트 2(서측 반원) 끝점:  x = -16.000, z = -4.000
   세그먼트 3(남측 직선) 시작점: x = -16.000, z = +32.000  ==> [🚨 36 units 순간이동!]

3. 세그먼트 3(남측 직선) 끝점:  x = +16.000, z = +32.000
   세그먼트 4(동측 반원) 시작점: x = +16.000, z = -4.000   ==> [🚨 36 units 순간이동!]

4. 세그먼트 4(동측 반원) 끝점:  x = +16.000, z = +32.000
   세그먼트 1(북측 직선) 시작점: x = +16.000, z = -4.000   ==> [🚨 36 units 순간이동!]
```

**수학적 원인 분석**:
`maps/care_room.js`의 세그먼트 2:
```javascript
// 세그먼트 2 (Line 59~63)
const phi = -Math.PI / 2 - t * Math.PI; // t=0일 때 phi = -PI/2
return {
  x: cxLeft + Math.cos(phi) * radius,
  z: cz - Math.sin(phi) * radius, // sin(-PI/2) = -1 이므로 z = 14 - (-1)*18 = 32!
};
```
직전 북측 직선은 `z = cz - radius = 14 - 18 = -4`에서 끝났는데, 반원 시작점의 삼각함수 식이 `z = 32`를 반환하여 북쪽에서 남쪽으로 1프레임 만에 날아가 버렸던 것입니다. 이로 인해 기차가 눈앞에서 갑자기 사라지고 반대편 선로에서 튀어나오는 현상이 발생했습니다.

---

### 🚨 [결함 2] 기차 진행 방향 문제 (정확히 -90도 위상 회전 오류로 인한 게걸음 주행)

`getTrackPoint` 함수에서 반환하는 `angle` 속성과 실제 기차 메시의 Three.js 회전(`rotation.y`) 간의 불일치:

```
[수치 검증 결과]
- 거리 10.0 (북측 직선 주행 시):
  실제 변위: dx = -0.1, dz = 0.0  --> 실제 진행각 atan2(dx, dz) = -90.0°
  함수 반환 angle:                 -180.0°  --> [🚨 오차: 정확히 -90.0°]
- 거리 100.0 (남측 직선 주행 시):
  실제 변위: dx = +0.1, dz = 0.0  --> 실제 진행각 atan2(dx, dz) = +90.0°
  함수 반환 angle:                    0.0°  --> [🚨 오차: 정확히 -90.0°]
- 모든 곡선 구간: 실제 탄젠트 각도 대비 항상 -90° 오차 유지!
```
이로 인해 기차 머리(기관차 굴뚝)가 앞을 보지 않고 선로 바깥쪽(또는 안쪽)을 바라보며 **게처럼 옆으로 달리는 현상**이 발생하고 있었습니다.

---

## 3. 원포인트 수정 솔루션 (Mathematical Patch)

[`maps/care_room.js`](file:///D:/Projects/eraser_hideandseek/maps/care_room.js)의 `getTrackPoint` 함수를 아래와 같이 기하학적 연속성이 완벽한 공식으로 교체합니다:

```javascript
function getTrackPoint(dist) {
  let d = ((dist % TRACK_TOTAL_LEN) + TRACK_TOTAL_LEN) % TRACK_TOTAL_LEN;
  const { cxLeft, cxRight, cz, radius, straightLen } = TRAIN_TRACK;

  // 1. 북측 직선: X = 16 -> -16, Z = -4 (진행방향: -X, yaw = -PI/2)
  if (d < straightLen) {
    const t = d / straightLen;
    return {
      x: cxRight - t * straightLen,
      z: cz - radius,
      angle: -Math.PI / 2
    };
  }
  d -= straightLen;

  // 2. 서측 반원: X = -16, Z = -4 -> 32 (각도 -PI/2 -> +PI/2, 시계방향 회전)
  if (d < TRACK_HALF_CIRC) {
    const t = d / TRACK_HALF_CIRC;
    const phi = -Math.PI / 2 + t * Math.PI; // -PI/2 -> +PI/2
    return {
      x: cxLeft - Math.cos(phi) * radius,
      z: cz + Math.sin(phi) * radius,
      angle: -Math.PI / 2 + t * Math.PI
    };
  }
  d -= TRACK_HALF_CIRC;

  // 3. 남측 직선: X = -16 -> 16, Z = 32 (진행방향: +X, yaw = +PI/2)
  if (d < straightLen) {
    const t = d / straightLen;
    return {
      x: cxLeft + t * straightLen,
      z: cz + radius,
      angle: Math.PI / 2
    };
  }
  d -= straightLen;

  // 4. 동측 반원: X = 16, Z = 32 -> -4 (각도 +PI/2 -> +3PI/2)
  const t = d / TRACK_HALF_CIRC;
  const phi = Math.PI / 2 + t * Math.PI; // PI/2 -> 3PI/2
  return {
    x: cxRight - Math.cos(phi) * radius,
    z: cz + Math.sin(phi) * radius,
    angle: Math.PI / 2 + t * Math.PI
  };
}
```

이 수식 교정으로:
1. $C^0$ 연속성 확보: 모든 세그먼트 전이 시 오차 **0.000000 units** (순간이동 완전 제거)
2. $C^1$ 탄젠트 연속성 확보: 모든 구간에서 각도 오차 **0.0°** (기차 정면 주행 완벽 일치)
