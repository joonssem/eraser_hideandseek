# -*- coding: utf-8 -*-
"""
scripts/95_verify_care_room_bug.py
maps/care_room.js에 실제로 작성된 getTrackPoint 함수를 시뮬레이션하여
진행 방향(angle)과 좌표 불연속(순간이동) 버그를 정확히 검증
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
TRACK_HALF_CIRC = math.pi * TRAIN_TRACK["radius"] # 56.548667764616276
TRACK_TOTAL_LEN = 2 * TRAIN_TRACK["straightLen"] + 2 * TRACK_HALF_CIRC # 177.09733552923255

def getTrackPoint(dist):
    d = ((dist % TRACK_TOTAL_LEN) + TRACK_TOTAL_LEN) % TRACK_TOTAL_LEN
    cxLeft = TRAIN_TRACK["cxLeft"]
    cxRight = TRAIN_TRACK["cxRight"]
    cz = TRAIN_TRACK["cz"]
    radius = TRAIN_TRACK["radius"]
    straightLen = TRAIN_TRACK["straightLen"]

    # 세그먼트 1: 북측 직선 (오른쪽 -> 왼쪽: X = 16 -> -16, Z = cz - radius = -4)
    if d < straightLen:
        t = d / straightLen
        return {
            "seg": 1,
            "x": cxRight - t * straightLen,
            "z": cz - radius,
            "angle": -math.pi # 서쪽(-X)
        }
    d -= straightLen

    # 세그먼트 2: 서측 반원 (North -> South: Z = -4 -> 32, 중심 cxLeft, cz)
    if d < TRACK_HALF_CIRC:
        t = d / TRACK_HALF_CIRC
        phi = -math.pi / 2 - t * math.pi # -PI/2 -> -3PI/2
        return {
            "seg": 2,
            "x": cxLeft + math.cos(phi) * radius,
            "z": cz - math.sin(phi) * radius,
            "angle": phi - math.pi / 2
        }
    d -= TRACK_HALF_CIRC

    # 세그먼트 3: 남측 직선 (왼쪽 -> 오른쪽: X = -16 -> 16, Z = cz + radius = 32)
    if d < straightLen:
        t = d / straightLen
        return {
            "seg": 3,
            "x": cxLeft + t * straightLen,
            "z": cz + radius,
            "angle": 0 # 동쪽(+X)
        }
    d -= straightLen

    # 세그먼트 4: 동측 반원 (South -> North: Z = 32 -> -4, 중심 cxRight, cz)
    t = d / TRACK_HALF_CIRC
    phi = math.pi / 2 - t * math.pi # PI/2 -> -PI/2
    return {
        "seg": 4,
        "x": cxRight + math.cos(phi) * radius,
        "z": cz - math.sin(phi) * radius,
        "angle": phi - math.pi / 2
    }

# 세그먼트 경계선에서의 연속성 및 각도 체크
print("--- [검증 1: 세그먼트 1 끝 vs 세그먼트 2 시작] ---")
s1_end = getTrackPoint(32.0 - 0.0001)
s2_start = getTrackPoint(32.0 + 0.0001)
print(f"S1 끝: x={s1_end['x']:.3f}, z={s1_end['z']:.3f}, angle={math.degrees(s1_end['angle']):.1f}°")
print(f"S2 시작: x={s2_start['x']:.3f}, z={s2_start['z']:.3f}, angle={math.degrees(s2_start['angle']):.1f}°")

print("\n--- [검증 2: 세그먼트 2 끝 vs 세그먼트 3 시작] ---")
s2_end = getTrackPoint(32.0 + TRACK_HALF_CIRC - 0.0001)
s3_start = getTrackPoint(32.0 + TRACK_HALF_CIRC + 0.0001)
print(f"S2 끝: x={s2_end['x']:.3f}, z={s2_end['z']:.3f}, angle={math.degrees(s2_end['angle']):.1f}°")
print(f"S3 시작: x={s3_start['x']:.3f}, z={s3_start['z']:.3f}, angle={math.degrees(s3_start['angle']):.1f}°")

print("\n--- [검증 3: 세그먼트 3 끝 vs 세그먼트 4 시작] ---")
s3_end = getTrackPoint(64.0 + TRACK_HALF_CIRC - 0.0001)
s4_start = getTrackPoint(64.0 + TRACK_HALF_CIRC + 0.0001)
print(f"S3 끝: x={s3_end['x']:.3f}, z={s3_end['z']:.3f}, angle={math.degrees(s4_start['angle']):.1f}°")
print(f"S4 시작: x={s4_start['x']:.3f}, z={s4_start['z']:.3f}, angle={math.degrees(s4_start['angle']):.1f}°")

print("\n--- [검증 4: 세그먼트 4 끝 vs 세그먼트 1 시작 (루프 랩어라운드)] ---")
s4_end = getTrackPoint(TRACK_TOTAL_LEN - 0.0001)
s1_start = getTrackPoint(0.0001)
print(f"S4 끝: x={s4_end['x']:.3f}, z={s4_end['z']:.3f}, angle={math.degrees(s4_end['angle']):.1f}°")
print(f"S1 시작: x={s1_start['x']:.3f}, z={s1_start['z']:.3f}, angle={math.degrees(s1_start['angle']):.1f}°")

print("\n--- [검증 5: 각 세그먼트 내부 이동 방향과 실제 진행 벡터(dx, dz)의 일치성] ---")
# 1 유닛 전진 시 실제 변위(dx, dz)와 지정된 angle 비교
test_dists = [10.0, 50.0, 100.0, 150.0]
for td in test_dists:
    p1 = getTrackPoint(td)
    p2 = getTrackPoint(td + 0.1)
    dx = p2["x"] - p1["x"]
    dz = p2["z"] - p1["z"]
    actual_yaw = math.atan2(dx, dz)
    print(f"거리 {td:5.1f} (Seg {p1['seg']}):")
    print(f"  좌표 변위: dx={dx:+.4f}, dz={dz:+.4f}")
    print(f"  실제 진행 방향(atan2(dx,dz)): {math.degrees(actual_yaw):+6.1f}°")
    print(f"  함수가 반환한 angle:         {math.degrees(p1['angle']):+6.1f}°")
    print(f"  각도 오차: {math.degrees(p1['angle'] - actual_yaw):+6.1f}°")
