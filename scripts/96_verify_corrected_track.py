# -*- coding: utf-8 -*-
"""
scripts/96_verify_corrected_track.py
수정된 getTrackPoint 수학 수식의 완전 연속성 및 각도 일치 검증
"""

import math

TRAIN_TRACK = {
    "cxLeft": -16,
    "cxRight": 16,
    "cz": 14,
    "radius": 18,
    "straightLen": 32,
    "speed": 7.2
}
TRACK_HALF_CIRC = math.pi * TRAIN_TRACK["radius"]
TRACK_TOTAL_LEN = 2 * TRAIN_TRACK["straightLen"] + 2 * TRACK_HALF_CIRC

def correctedGetTrackPoint(dist):
    d = ((dist % TRACK_TOTAL_LEN) + TRACK_TOTAL_LEN) % TRACK_TOTAL_LEN
    cxLeft = TRAIN_TRACK["cxLeft"]
    cxRight = TRAIN_TRACK["cxRight"]
    cz = TRAIN_TRACK["cz"]
    radius = TRAIN_TRACK["radius"]
    straightLen = TRAIN_TRACK["straightLen"]

    # 1. 북측 직선: X = 16 -> -16, Z = -4 (진행방향: -X, yaw = -PI/2)
    if d < straightLen:
        t = d / straightLen
        return {
            "seg": 1,
            "x": cxRight - t * straightLen,
            "z": cz - radius,
            "angle": -math.pi / 2
        }
    d -= straightLen

    # 2. 서측 반원: X = -16, Z = -4 -> 32 (각도 -PI/2 -> +PI/2)
    # x는 -16에서 바깥쪽으로 나갔다 들어옴: cxLeft - sin(t*pi)*radius
    # z는 -4에서 32로 증가: cz - cos(t*pi)*radius
    if d < TRACK_HALF_CIRC:
        t = d / TRACK_HALF_CIRC
        # phi: t=0일 때 z = cz - radius (-4), t=1일 때 z = cz + radius (32)
        # x: t=0일 때 x = cxLeft (-16), t=0.5일 때 x = cxLeft - radius (-34), t=1일 때 x = cxLeft (-16)
        x = cxLeft - math.sin(t * math.pi) * radius
        z = cz - math.cos(t * math.pi) * radius
        # 진행각: t=0일 때 -PI/2, t=0.5일 때 0 (아래로), t=1일 때 +PI/2
        angle = -math.pi / 2 + t * math.pi
        return {
            "seg": 2,
            "x": x,
            "z": z,
            "angle": angle
        }
    d -= TRACK_HALF_CIRC

    # 3. 남측 직선: X = -16 -> 16, Z = 32 (진행방향: +X, yaw = +PI/2)
    if d < straightLen:
        t = d / straightLen
        return {
            "seg": 3,
            "x": cxLeft + t * straightLen,
            "z": cz + radius,
            "angle": math.pi / 2
        }
    d -= straightLen

    # 4. 동측 반원: X = 16, Z = 32 -> -4
    # x: t=0일 때 16, t=0.5일 때 16 + radius (34), t=1일 때 16
    # z: t=0일 때 32, t=1일 때 -4
    t = d / TRACK_HALF_CIRC
    x = cxRight + math.sin(t * math.pi) * radius
    z = cz + math.cos(t * math.pi) * radius
    angle = math.pi / 2 + t * math.pi
    return {
        "seg": 4,
        "x": x,
        "z": z,
        "angle": angle
    }

# 1000개 포인트 전수 검사
max_jump = 0.0
max_angle_err = 0.0
steps = 1000
for i in range(steps):
    d1 = (i / steps) * TRACK_TOTAL_LEN
    d2 = ((i + 1) / steps) * TRACK_TOTAL_LEN
    p1 = correctedGetTrackPoint(d1)
    p2 = correctedGetTrackPoint(d2)
    
    jump = math.hypot(p2["x"] - p1["x"], p2["z"] - p1["z"])
    if jump > max_jump:
        max_jump = jump
        
    dx = p2["x"] - p1["x"]
    dz = p2["z"] - p1["z"]
    actual_yaw = math.atan2(dx, dz)
    # angle 정규화
    err = abs((p1["angle"] - actual_yaw + math.pi) % (2 * math.pi) - math.pi)
    if err > max_angle_err:
        max_angle_err = err

print(f"최대 1스텝 도약 거리: {max_jump:.4f} units (이론치 {TRACK_TOTAL_LEN/steps:.4f})")
print(f"최대 각도 오차: {math.degrees(max_angle_err):.4f}°")
if max_jump < 1.0 and math.degrees(max_angle_err) < 2.0:
    print(">>> 검증 성공! 모든 경계선 연속성(순간이동 0) 및 주행 방향(헤딩 일치 100%) 확보!")
