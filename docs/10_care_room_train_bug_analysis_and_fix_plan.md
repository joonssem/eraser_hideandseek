# 돌봄교실 장난감 기차 버그 분석 및 수정 계획서

- **문서 번호**: `docs/10_care_room_train_bug_analysis_and_fix_plan.md`
- **작성일**: 2026. 09. 23
- **상태**: 버그 원인 규명 및 수학적 수정 공식 검증 완료 (`수정 준비 완료`)
- **대상 파일**: [`maps/care_room.js`](file:///D:/Projects/eraser_hideandseek/maps/care_room.js) (라인 26~87, 506~548)
- **검증 스크립트**:
  - 버그 수치 재현: [`scripts/95_verify_care_room_bug.py`](file:///D:/Projects/eraser_hideandseek/scripts/95_verify_care_room_bug.py)
  - 수정 수식 전수 검사: [`scripts/96_verify_corrected_track.py`](file:///D:/Projects/eraser_hideandseek/scripts/96_verify_corrected_track.py)
- **연계 문서**: [`docs/05_new_maps_specification.md`](./05_new_maps_specification.md), [`interim_reports/02_care_room_train_bug_fix_plan.md`](../interim_reports/02_care_room_train_bug_fix_plan.md)

---

## 1. 문제 개요 (Reported Issues)

돌봄교실 맵의 핵심 동적 기믹인 **'장난감 기차(Toy Train)'** 주행 중 다음과 같은 두 가지 심각한 버그가 발생함:

1. **기차 진행 방향 왜곡 (헤딩 불일치 및 게걸음 주행)**:
   - 기차 머리(기관차 보일러 및 굴뚝)가 주행 방향 정면을 보지 않고 선로 바깥쪽으로 90도 회전한 채 옆으로 달림.
2. **기차 증발 및 순간이동 (Teleportation)**:
   - 기차가 트랙을 주행하던 도중 중간에 연기처럼 사라졌다가, 선로 반대편 엉뚱한 위치로 순간이동하여 튀어나옴.

---

## 2. 정밀 원인 분석 (Root Causes)

[`maps/care_room.js`](file:///D:/Projects/eraser_hideandseek/maps/care_room.js)의 궤적 계산 함수 `getTrackPoint(dist)`에 대한 수학적 전수 검사 결과, 다음 결함이 발견됨:

### 2.1 [원인 1] 세그먼트 전이 시 Z축 36 유닛 대도약 (순간이동의 원인)
트랙은 총 4개 세그먼트(북측 직선 $\to$ 서측 반원 $\to$ 남측 직선 $\to$ 동측 반원)로 구성되어 있음.
그러나 원호 구간의 위상각(`phi`)과 Z축 부호 정의 오류로 인해 **각 세그먼트가 끝나는 지점마다 Z좌표가 36 units씩 급변**함:

```
[수치 검증 데이터 - scripts/95_verify_care_room_bug.py]
- 세그먼트 1 (북측 직선) 끝점:  x = -16.0, z = -4.0
- 세그먼트 2 (서측 반원) 시작점: x = -16.0, z = +32.0  --> [🚨 Z축 +36 units 순간이동!]
- 세그먼트 2 (서측 반원) 끝점:  x = -16.0, z = -4.0
- 세그먼트 3 (남측 직선) 시작점: x = -16.0, z = +32.0  --> [🚨 Z축 +36 units 순간이동!]
- 세그먼트 3 (남측 직선) 끝점:  x = +16.0, z = +32.0
- 세그먼트 4 (동측 반원) 시작점: x = +16.0, z = -4.0   --> [🚨 Z축 -36 units 순간이동!]
- 세그먼트 4 (동측 반원) 끝점:  x = +16.0, z = +32.0
- 세그먼트 1 (북측 직선) 시작점: x = +16.0, z = -4.0   --> [🚨 Z축 -36 units 순간이동!]
```

*근본 이유*: 세그먼트 2의 $Z$ 계산식인 `cz - Math.sin(phi)*radius`에서 $t=0$일 때 $\phi = -\pi/2$이므로 $\sin(-\pi/2) = -1$이 되어 $z = 14 - (-1)\times 18 = 32$가 계산됨. 직전 직선이 $z = -4$에서 끝났으므로 1프레임 만에 $z$가 $-4 \to 32$로 튀어 순간이동 발생.

### 2.2 [원인 2] 진행각(Yaw)과 실제 이동 벡터 간 -90도 오차 (게걸음 주행의 원인)
Three.js의 Y축 회전각 체계(`atan2(dx, dz)`)와 `getTrackPoint`에서 반환하는 고정 `angle`이 전 구간에서 **정확히 -90도 위상차**를 가짐:
- 북측 직선(-X 주행): 실제 진행각 $-90.0^\circ$, 반환 각도 $-180.0^\circ$ (오차 $-90^\circ$)
- 남측 직선(+X 주행): 실제 진행각 $+90.0^\circ$, 반환 각도 $0.0^\circ$ (오차 $-90^\circ$)
- 곡선 구간: 전체 구간에서 오차 $-90.0^\circ$ 지속 $\to$ 차체가 옆으로 꺾여 주행.

---

## 3. 수정 계획 및 수식 검증

### 3.1 완전 연속성 보장 교정 수식 (`correctedGetTrackPoint`)
[`maps/care_room.js`](file:///D:/Projects/eraser_hideandseek/maps/care_room.js)의 `getTrackPoint` 함수를 다음과 같이 수정:

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

  // 2. 서측 반원: X = -16, Z = -4 -> 32
  if (d < TRACK_HALF_CIRC) {
    const t = d / TRACK_HALF_CIRC;
    const x = cxLeft - Math.sin(t * Math.PI) * radius;
    const z = cz - Math.cos(t * Math.PI) * radius;
    const angle = -Math.PI / 2 + t * Math.PI;
    return { x, z, angle };
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

  // 4. 동측 반원: X = 16, Z = 32 -> -4
  const t = d / TRACK_HALF_CIRC;
  const x = cxRight + Math.sin(t * Math.PI) * radius;
  const z = cz + Math.cos(t * Math.PI) * radius;
  const angle = Math.PI / 2 + t * Math.PI;
  return { x, z, angle };
}
```

### 3.2 수치 검증 결과 ([`scripts/96_verify_corrected_track.py`](file:///D:/Projects/eraser_hideandseek/scripts/96_verify_corrected_track.py))
- 1,000개 포인트 전수 검사 결과:
  - **최대 1스텝 변위**: $0.1771 \text{ units}$ (이론치와 완벽 일치 $\to$ **순간이동 0%**)
  - **최대 각도 오차**: $0.2819^\circ$ (실질적 **진행 방향 100% 일치**)

---

## 4. 적용 체크리스트

- [ ] [`maps/care_room.js`](file:///D:/Projects/eraser_hideandseek/maps/care_room.js) 내 `getTrackPoint` 함수 본문 교체
- [ ] 침목(Sleeper) 배치 루프([Line 360~365](file:///D:/Projects/eraser_hideandseek/maps/care_room.js#L360-L365))가 올바른 궤도 좌표를 참조하는지 확인
- [ ] 브라우저 로컬 프리뷰([`maps/preview.html`](file:///D:/Projects/eraser_hideandseek/maps/preview.html)) 실행을 통한 기차 주행 육안 검증
