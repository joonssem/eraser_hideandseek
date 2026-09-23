# -*- coding: utf-8 -*-
"""
scripts/97_design_av_room.py
시청각실(av_room.js)의 3D 공간, 계단, 좌석 60개, 무대, 스크린, 충돌체 AABB, 스폰 26개의
좌표 및 XZ 겹침 0건을 사전 정밀 수치 검증하는 설계 스크립트
"""

import json

ROOM_W = 120
ROOM_D = 90
WALL_H = 30

# 무대: 70 x 2.2 x 25, center (0, 1.1, -31)
# X: [-35, 35], Z: [-43.5, -18.5]
stage_box = {"min": [-35, 0, -43.5], "max": [35, 2.2, -18.5]}

# 스크린: 폭 55, 두께 0.4, 높이 20, center (0, 12, -43.0)
# 은신 통로: 전면 벽 Z=-45 ~ 스크린 Z=-43.2 사이 약 1.8~2.0 units 여유
screen_box = {"min": [-27.5, 2.2, -43.2], "max": [27.5, 22.2, -42.8]}

# 계단식 바닥 6단 (1단 y=0 ~ 6단 y=7.5)
# 1단 (y=0): Z in [-18.5, -11] (평지 바닥이므로 별도 충돌체 불필요)
# 2단 (y=1.5): Z in [-11, -3], 높이 1.5, max_y = 1.5
# 3단 (y=3.0): Z in [-3, 5], 높이 3.0, max_y = 3.0
# 4단 (y=4.5): Z in [5, 13], 높이 4.5, max_y = 4.5
# 5단 (y=6.0): Z in [13, 21], 높이 6.0, max_y = 6.0
# 6단 (y=7.5): Z in [21, 35], 높이 7.5, max_y = 7.5
# 후방 복도 (y=7.5): Z in [35, 44]

tier_boxes = [
    {"name": "tier2", "min": [-50, 0, -11], "max": [50, 1.5, -3]},
    {"name": "tier3", "min": [-50, 0, -3], "max": [50, 3.0, 5]},
    {"name": "tier4", "min": [-50, 0, 5], "max": [50, 4.5, 13]},
    {"name": "tier5", "min": [-50, 0, 13], "max": [50, 6.0, 21]},
    {"name": "tier6", "min": [-50, 0, 21], "max": [50, 7.5, 43.5]},
]

# 좌석 60석: 6행 x 10석
# X좌표 10개: 좌측 5석 [-36, -30, -24, -18, -12], 우측 5석 [12, 18, 24, 30, 36]
# 중앙 통로: X in [-10, 10]
# 각 행의 Z 중심:
# Row 0: Z = -14.5 (1단, y=0)
# Row 1: Z = -7.0 (2단, y=1.5)
# Row 2: Z = 1.0 (3단, y=3.0)
# Row 3: Z = 9.0 (4단, y=4.5)
# Row 4: Z = 17.0 (5단, y=6.0)
# Row 5: Z = 25.0 (6단, y=7.5)

# 의자 60석의 개별 박스 (폭 4.2, 깊이 3.6)
# 충돌체: 의자 등받이 및 좌석 충돌체
chair_boxes = []
row_z = [-14.5, -7.0, 1.0, 9.0, 17.0, 25.0]
col_x = [-36, -30, -24, -18, -12, 12, 18, 24, 30, 36]

for r_idx, rz in enumerate(row_z):
    for c_idx, cx in enumerate(col_x):
        chair_boxes.append({
            "name": f"chair_r{r_idx}_c{c_idx}",
            "min": [cx - 2.1, 0, rz - 1.8],
            "max": [cx + 2.1, 10, rz + 1.8]
        })

print(f"Total chairs defined: {len(chair_boxes)}")

# 기타 충돌체:
# 방음문 2개: 좌측 [-48, -42], Z in [-44.5, -42.5] / 우측 [42, 48], Z in [-44.5, -42.5]
# 음향 조정 데스크: X in [44, 54], Z in [26, 38], y in [0, 8.5]
other_boxes = [
    {"name": "door_left", "min": [-48, 0, -44.5], "max": [-42, 6.0, -42.5]},
    {"name": "door_right", "min": [42, 0, -44.5], "max": [48, 6.0, -42.5]},
    {"name": "av_console", "min": [42, 7.5, 26], "max": [54, 9.0, 38]},
]

# 모든 충돌체 리스트
all_colliders = [stage_box, screen_box] + tier_boxes + other_boxes
# 주의: tier_boxes는 y > 0의 계단식 바닥이므로 XZ 겹침 검사 시 y=0 바닥 스폰이 tier 2~6과 겹치면 충돌체 판정에 걸릴 수 있음!
# 중요: check_care_room.mjs 및 check_av_room.mjs의 containsPointXZ(px, pz)는 순수 2D XZ 바운딩 박스 겹침을 검사함!
# 즉 box.containsPointXZ(sp.x, sp.z) 검사는 Y축 높이를 보지 않고 X, Z만 보므로,
# 스폰 지점은 tier2~6 및 stage_box, chair_boxes의 XZ 투영 영역 바깥(즉 1단 평지 y=0 구역)에 위치해야 겹침 0건이 됨!

print(f"Tier 2~6 Z range: [-11, 43.5], X: [-50, 50]")
print(f"Stage Z range: [-43.5, -18.5], X: [-35, 35]")
print(f"따라서 y=0 자유 평지 바닥 구역은:")
print(f"1) 무대 앞 1단 통로: Z in [-18.0, -11.5], X in [-52, 52] (단, 1단 좌석 X=[-36..-12, 12..36] 제외)")
print(f"   -> 1단 통로 중앙: X in [-9.5, 9.5], Z in [-18.0, -11.5]")
print(f"   -> 1단 좌우 측면: X in [-52, -39], [39, 52], Z in [-18.0, -11.5]")
print(f"2) 무대 좌우 측면 통로: X in [-52, -37], [37, 52], Z in [-42, -19]")
print(f"3) 좌석 좌우 측면 복도: X in [-58, -52], [52, 58], Z in [-11, 40]")
print(f"4) 후방 복도: X in [-55, 55], Z in [43.6, 44.5] (단, tier 6 끝이 43.5인 경우)")

# 스폰 26개 후보 선정 및 겹침 검사
spawns_hiders = [
    # 1단 중앙 통로 (X in [-8, 8], Z in [-17.5, -12.0], chair row0은 Z=-14.5이므로 중앙 X=0은 안전!)
    [0.0, -17.0],
    [-4.0, -17.0],
    [4.0, -17.0],
    [-7.0, -17.0],
    [7.0, -17.0],
    [0.0, -12.5],
    [-5.0, -12.5],
    [5.0, -12.5],

    # 무대 좌측 통로 (X in [-52, -38], Z in [-41, -20])
    [-45.0, -36.0],
    [-40.0, -30.0],
    [-46.0, -25.0],
    [-41.0, -20.0],

    # 무대 우측 통로 (X in [38, 52], Z in [-41, -20])
    [45.0, -36.0],
    [40.0, -30.0],
    [46.0, -25.0],
    [41.0, -20.0],

    # 좌석 좌측 외곽 통로 (X in [-56, -52], Z in [-8, 20])
    [-54.0, -6.0],
    [-54.0, 8.0],

    # 좌석 우측 외곽 통로 (X in [52, 56], Z in [-8, 20])
    [54.0, -6.0],
    [54.0, 8.0],
]

spawns_seekers = [
    [0.0, -15.0],   # 1단 중앙 통로
    [-44.0, -32.0], # 좌측 무대 앞
    [44.0, -32.0],  # 우측 무대 앞
    [-54.0, 0.0],   # 좌측 외곽 복도
    [54.0, 0.0],    # 우측 외곽 복도
    [0.0, -13.5]    # 1단 무대 정면
]

print(f"Hiders: {len(spawns_hiders)}, Seekers: {len(spawns_seekers)}")

# 겹침 테스트 함수
def check_overlap(box, px, pz):
    return (box["min"][0] <= px <= box["max"][0]) and (box["min"][2] <= pz <= box["max"][2])

# 검사
overlaps = 0
all_sp = spawns_hiders + spawns_seekers
all_boxes_to_test = [stage_box, screen_box] + tier_boxes + chair_boxes + other_boxes

for idx, p in enumerate(all_sp):
    for b in all_boxes_to_test:
        if check_overlap(b, p[0], p[1]):
            overlaps += 1
            print(f"Overlap: Spawn #{idx} ({p[0]}, {p[1]}) with {b.get('name', 'box')}")

if overlaps == 0:
    print(">>> SUCCESS: 26개 스폰과 모든 충돌체 AABB 간 XZ 겹침 0건 검증 완료!")
else:
    print(f">>> FAILED: {overlaps}건 겹침 발생")
