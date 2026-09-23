# -*- coding: utf-8 -*-
"""
scripts/92_simulate_train_trajectory.py
돌봄교실 장난감 기차 궤적 시뮬레이션 및 버그(진행 방향 오차, 경계선 순간이동) 원인 분석 및 해결 검증 스크립트
"""

import math
import json
import os

def run_simulation():
    # 1. 버그 재현 모델: 나이브한 4구간(분기) 트랙 또는 핑퐁 트랙
    # 가정 1: 직사각형 트랙 (폭 W=60, 깊이 D=40, 코너 라운딩 R=10)
    # 총 둘레 계산 및 각도 계산
    
    print("[1] 나이브 매개변수화에서 발생하는 문제 분석:")
    # 문제 A: 경계 랩어라운드(t: 0.999 -> 0.001)에서 불연속(Discontinuity)
    # 만약 루프가 완벽히 닫히지 않았거나(Pn != P0), mod 연산 오차로 인한 순간이동
    
    # 올바른 닫힌 루프(Closed Spline / Rounded Track) 매개변수화 모델:
    # 직선 2개(길이 Lx = 40), 직선 2개(길이 Lz = 20), 4개의 90도 원호(반지름 R = 10, 호 길이 = 0.5 * pi * R)
    Lx = 40.0
    Lz = 20.0
    R = 10.0
    arc_len = 0.5 * math.pi * R
    total_len = 2 * Lx + 2 * Lz + 4 * arc_len
    
    print(f"  - 트랙 직선 구간 Lx={Lx}, Lz={Lz}, 코너 반경 R={R}")
    print(f"  - 총 트랙 둘레 길이: {total_len:.4f} units")

    def get_track_state(s):
        """호 길이(s: 0 ~ total_len)에 따른 정확한 위치 (x, z) 및 단위 진행 방향 벡터 (tx, tz), 회전각 yaw 계산"""
        # s 정규화 (항상 0 <= s < total_len 보장)
        s = s % total_len
        if s < 0:
            s += total_len
            
        # 세그먼트별 순차 추적
        # 1. 하단 직선: (-Lx/2, -Lz/2 - R) -> (Lx/2, -Lz/2 - R) [우측으로 +x]
        if s < Lx:
            prog = s
            x = -Lx/2 + prog
            z = -Lz/2 - R
            tx, tz = 1.0, 0.0
            yaw = math.atan2(tx, tz) # Three.js 기준 Z축 정면일 때 yaw
            return x, z, tx, tz, yaw
        s -= Lx
        
        # 2. 우하단 코너 원호 (중심: Lx/2, -Lz/2, 각도 -pi/2 -> 0)
        if s < arc_len:
            th = -math.pi/2 + (s / arc_len) * (math.pi/2)
            x = Lx/2 + R * math.cos(th)
            z = -Lz/2 + R * math.sin(th)
            tx = -math.sin(th)
            tz = math.cos(th)
            yaw = math.atan2(tx, tz)
            return x, z, tx, tz, yaw
        s -= arc_len
        
        # 3. 우측 직선: (Lx/2 + R, -Lz/2) -> (Lx/2 + R, Lz/2) [위로 +z]
        if s < Lz:
            prog = s
            x = Lx/2 + R
            z = -Lz/2 + prog
            tx, tz = 0.0, 1.0
            yaw = math.atan2(tx, tz)
            return x, z, tx, tz, yaw
        s -= Lz
        
        # 4. 우상단 코너 원호 (중심: Lx/2, Lz/2, 각도 0 -> pi/2)
        if s < arc_len:
            th = 0.0 + (s / arc_len) * (math.pi/2)
            x = Lx/2 + R * math.cos(th)
            z = Lz/2 + R * math.sin(th)
            tx = -math.sin(th)
            tz = math.cos(th)
            yaw = math.atan2(tx, tz)
            return x, z, tx, tz, yaw
        s -= arc_len
        
        # 5. 상단 직선: (Lx/2, Lz/2 + R) -> (-Lx/2, Lz/2 + R) [좌측으로 -x]
        if s < Lx:
            prog = s
            x = Lx/2 - prog
            z = Lz/2 + R
            tx, tz = -1.0, 0.0
            yaw = math.atan2(tx, tz)
            return x, z, tx, tz, yaw
        s -= Lx
        
        # 6. 좌상단 코너 원호 (중심: -Lx/2, Lz/2, 각도 pi/2 -> pi)
        if s < arc_len:
            th = math.pi/2 + (s / arc_len) * (math.pi/2)
            x = -Lx/2 + R * math.cos(th)
            z = Lz/2 + R * math.sin(th)
            tx = -math.sin(th)
            tz = math.cos(th)
            yaw = math.atan2(tx, tz)
            return x, z, tx, tz, yaw
        s -= arc_len
        
        # 7. 좌측 직선: (-Lx/2 - R, Lz/2) -> (-Lx/2 - R, -Lz/2) [아래로 -z]
        if s < Lz:
            prog = s
            x = -Lx/2 - R
            z = Lz/2 - prog
            tx, tz = 0.0, -1.0
            yaw = math.atan2(tx, tz)
            return x, z, tx, tz, yaw
        s -= Lz
        
        # 8. 좌하단 코너 원호 (중심: -Lx/2, -Lz/2, 각도 pi -> 3*pi/2)
        th = math.pi + (s / arc_len) * (math.pi/2)
        x = -Lx/2 + R * math.cos(th)
        z = -Lz/2 + R * math.sin(th)
        tx = -math.sin(th)
        tz = math.cos(th)
        yaw = math.atan2(tx, tz)
        return x, z, tx, tz, yaw

    # 연속성 및 경계선(Wrap-around) 검증: s = total_len - 0.001 -> s = 0.001
    p_end = get_track_state(total_len - 0.0001)
    p_start = get_track_state(0.0001)
    dist = math.hypot(p_end[0] - p_start[0], p_end[1] - p_start[1])
    print(f"\n[2] 경계선 연속성(C0) 검증: 끝점과 시작점 간 거리 = {dist:.6f} units (0에 수렴해야 함)")
    
    # 탄젠트 연속성(C1) 검증
    tangent_dot = p_end[2] * p_start[2] + p_end[3] * p_start[3]
    print(f"[3] 경계선 탄젠트 연속성(C1) 검증: Dot product = {tangent_dot:.6f} (1.0에 수렴해야 함)")

    # 100개 샘플 포인트 생성하여 연속성 데이터 추출
    samples = []
    speeds = 8.0 # units / sec
    loop_period = total_len / speeds
    num_steps = 120
    
    max_step_jump = 0.0
    for i in range(num_steps):
        t = (i / num_steps) * loop_period
        s = (t * speeds) % total_len
        x, z, tx, tz, yaw = get_track_state(s)
        samples.append({
            "step": i,
            "time": round(t, 3),
            "dist_s": round(s, 3),
            "x": round(x, 3),
            "z": round(z, 3),
            "tx": round(tx, 4),
            "tz": round(tz, 4),
            "yaw_deg": round(math.degrees(yaw), 2)
        })
        if i > 0:
            prev = samples[-2]
            step_jump = math.hypot(x - prev["x"], z - prev["z"])
            if step_jump > max_step_jump:
                max_step_jump = step_jump
                
    print(f"[4] 시뮬레이션 정상 완료: 최대 1스텝 변위 = {max_step_jump:.4f} units (순간이동 없음)")

    # 결과 저장
    out_path = os.path.join("intermediate_results", "train_trajectory_simulation.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({
            "total_len": total_len,
            "loop_period_sec": loop_period,
            "c0_dist": dist,
            "c1_tangent_dot": tangent_dot,
            "samples_count": len(samples),
            "samples": samples[:25] # 대표 샘플
        }, f, indent=2, ensure_ascii=False)
    print(f"[5] 시뮬레이션 결과 파일 저장 완료: {out_path}")

if __name__ == "__main__":
    run_simulation()
