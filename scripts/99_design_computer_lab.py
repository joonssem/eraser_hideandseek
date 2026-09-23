# -*- coding: utf-8 -*-
"""
scripts/99_design_computer_lab.py
컴퓨터실(computer_lab.js)의 3D 공간, 학생 PC 24석(좌12, 우12), 중앙 통로 폭 18,
AABB 충돌체, 스폰 26개의 좌표 및 XZ 겹침 0건을 사전 정밀 수치 검증하는 설계 스크립트
"""

ROOM_W = 120
ROOM_D = 90
WALL_H = 26

# 중앙 통로: X in [-9.0, 9.0] (폭 18.0)
# 학생 구역: Z in [-20, 32]
# 좌측 12석: 4행 x 3열
# 우측 12석: 4행 x 3열

row_z = [-16.0, -2.0, 12.0, 26.0]
left_col_x = [-45.0, -31.0, -17.0]
right_col_x = [17.0, 31.0, 45.0]

colliders = []

# 1. 외벽 4면
colliders.append({"name": "wall_north", "min": [-60, 0, -46], "max": [60, WALL_H, -44]})
colliders.append({"name": "wall_south", "min": [-60, 0, 44], "max": [60, WALL_H, 46]})
colliders.append({"name": "wall_west", "min": [-61, 0, -45], "max": [-59, WALL_H, 45]})
colliders.append({"name": "wall_east", "min": [59, 0, -45], "max": [61, WALL_H, 45]})

# 2. 교사 데스크: center (0, 1.4, -34), size (14, 2.8, 4.5)
colliders.append({"name": "teacher_desk", "min": [-7.0, 0, -36.25], "max": [7.0, 2.8, -31.75]})

# 3. 전면 스크린: center (0, 15, -44.2), size (45, 18, 0.4)
colliders.append({"name": "screen", "min": [-22.5, 6, -44.4], "max": [22.5, 24, -44.0]})

# 4. 학생 PC 24석 충돌체
# 각 책상: 너비 8.0 (X in [cx-4, cx+4]), 깊이 3.6 (Z in [cz-1.8, cz+1.8]), 상판 y in [2.6, 3.0]
# 각 본체: 우측 하단 (cx + 2.5, cz - 0.2), 너비 1.2, 깊이 2.6, 높이 1.8 (y in [0, 1.8])
# 각 의자: (cx, cz + 2.4), 좌판 너비 2.6, 깊이 2.6, 높이 0.5 (y in [1.4, 1.9])

pc_stations = []
station_idx = 0

for r_idx, rz in enumerate(row_z):
    for c_idx, cx in enumerate(left_col_x + right_col_x):
        side = "left" if cx < 0 else "right"
        station_name = f"pc_{side}_r{r_idx}_c{c_idx%3}"
        pc_stations.append({"name": station_name, "cx": cx, "cz": rz, "side": side})
        
        # A. 책상 상판 충돌체 (y in [2.6, 3.0])
        colliders.append({
            "name": f"{station_name}_tabletop",
            "min": [cx - 4.0, 2.5, rz - 1.8],
            "max": [cx + 4.0, 3.0, rz + 1.8]
        })
        # B. 책상 좌측 다리 (x in [cx-3.9, cx-3.6])
        colliders.append({
            "name": f"{station_name}_leg_L",
            "min": [cx - 3.9, 0, rz - 1.7],
            "max": [cx - 3.6, 2.6, rz + 1.7]
        })
        # C. 책상 우측 다리 (x in [cx+3.6, cx+3.9])
        colliders.append({
            "name": f"{station_name}_leg_R",
            "min": [cx + 3.6, 0, rz - 1.7],
            "max": [cx + 3.9, 2.6, rz + 1.7]
        })
        # D. 본체 (x in [cx+2.0, cx+3.2], z in [rz-1.5, rz+1.1])
        colliders.append({
            "name": f"{station_name}_tower",
            "min": [cx + 2.0, 0, rz - 1.5],
            "max": [cx + 3.2, 1.8, rz + 1.1]
        })
        # E. 의자 좌판 (cx-1.3 ~ cx+1.3, rz+1.3 ~ rz+3.3)
        colliders.append({
            "name": f"{station_name}_chair",
            "min": [cx - 1.3, 0.5, rz + 1.3],
            "max": [cx + 1.3, 2.5, rz + 3.3]
        })

print(f"Total PC stations: {len(pc_stations)}")
left_count = len([s for s in pc_stations if s["side"] == "left"])
right_count = len([s for s in pc_stations if s["side"] == "right"])
print(f"Left stations: {left_count}, Right stations: {right_count}")

# 중앙 통로 검증: 학생 구역 Z in [-20, 32]에서 통로 X in [-9.0, 9.0] 침범 검사
aisle_violations = 0
for b in colliders:
    # 교사 데스크는 Z < -30이므로 제외
    if b["min"][2] >= -22 and b["max"][2] <= 34:
        # 통로 침범 조건: b.max.x > -9.0 and b.min.x < 9.0
        if b["max"][0] > -9.0 and b["min"][0] < 9.0:
            aisle_violations += 1
            print(f"Aisle violation: {b['name']} [minX:{b['min'][0]}, maxX:{b['max'][0]}]")

print(f"Aisle violations in student zone: {aisle_violations} (0이어야 함!)")

# 스폰 26개 정의
spawns_seekers = [
    [0.0, -22.0],  # 중앙 통로 전방
    [0.0, 0.0],    # 중앙 통로 중앙
    [0.0, 22.0],   # 중앙 통로 후방
    [0.0, 38.0],   # 후방 통로 중앙
    [-54.0, 0.0],  # 좌측 외곽 통로
    [54.0, 0.0]    # 우측 외곽 통로
]

spawns_hiders = [
    # 중앙 통로 주변 안전 지점 (X in [-5, 5])
    [0.0, -16.0], [0.0, -8.0], [0.0, -2.0], [0.0, 6.0], [0.0, 12.0], [0.0, 26.0],
    # 좌측 외곽 통로 (X = -54)
    [-54.0, -25.0], [-54.0, -16.0], [-54.0, 12.0], [-54.0, 26.0],
    # 우측 외곽 통로 (X = 54)
    [54.0, -25.0], [54.0, -16.0], [54.0, 12.0], [54.0, 26.0],
    # 후방 복도 (Z = 38)
    [-30.0, 38.0], [30.0, 38.0],
    # 전면 교사 구역 통로 (Z = -25)
    [-25.0, -25.0], [25.0, -25.0],
    # 행간 통로 (Z = 5.0)
    [-24.0, 5.0], [24.0, 5.0]
]

print(f"Seekers: {len(spawns_seekers)}, Hiders: {len(spawns_hiders)}")

# 겹침 테스트
def check_overlap(box, px, pz):
    return (box["min"][0] <= px <= box["max"][0]) and (box["min"][2] <= pz <= box["max"][2])

overlaps = 0
all_sp = spawns_hiders + spawns_seekers
for idx, p in enumerate(all_sp):
    for b in colliders:
        if check_overlap(b, p[0], p[1]):
            overlaps += 1
            print(f"Overlap: Spawn #{idx} ({p[0]}, {p[1]}) with {b['name']}")

if overlaps == 0:
    print(">>> SUCCESS: 26개 스폰과 모든 충돌체 AABB 간 XZ 겹침 0건 검증 완료!")
else:
    print(f">>> FAILED: {overlaps}건 겹침 발생")
