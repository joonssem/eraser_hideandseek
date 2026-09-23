# -*- coding: utf-8 -*-
"""
scripts/93_calculate_new_maps_spec.py
신규 제안 장소 3종(시청각실, 컴퓨터실, 도서실 확장)의 공간 치수, Three.js 지오메트리 수량,
충돌체(Box3) 개수, 스포이드 샘플러 및 스폰 포인트 수치 계산 및 데이터 저장
"""

import json
import os

def calculate_specs():
    specs = {
        "audio_visual_room": {
            "name": "시청각실",
            "english_id": "av_room",
            "icon": "🎬",
            "room_dimensions": {"width": 100, "height": 30, "depth": 110},
            "theme_elements": {
                "stage": {
                    "dims": {"width": 70, "height": 2.2, "depth": 25},
                    "pos": {"x": 0, "y": 1.1, "z": -38},
                    "color": "#8c5a2b", # 무대 나무색
                    "hiding_behind_screen": {"gap_depth": 1.8, "screen_width": 55, "screen_height": 20}
                },
                "stadium_seating": {
                    "tiers_count": 6,
                    "tier_rise": 1.5, # 단차 높이
                    "tier_run": 8.0,  # 단차 깊이
                    "chairs_per_row": 10,
                    "total_chairs": 60,
                    "chair_color": "#9e2a2b", # 붉은 벽돌색
                    "seat_foldable": True,
                    "seat_gap_hiding": True
                },
                "doors": {
                    "count": 2,
                    "type": "soundproof_heavy_double",
                    "pos": [{"x": -46, "z": -30}, {"x": 46, "z": -30}],
                    "color": "#3d405b"
                },
                "ceiling_projector": {
                    "pos": {"x": 0, "y": 24, "z": 5},
                    "light_beam": True
                },
                "walls": {
                    "acoustic_panels": True,
                    "color": "#d8d4cd" # 흡음 패널
                }
            },
            "estimated_colliders": 140, # 무대, 계단 단차, 의자 바운딩, 벽, 문
            "estimated_meshes": 380,
            "spawn_points": {
                "seeker": [{"x": 0, "y": 2.2, "z": -35}, {"x": -35, "y": 0, "z": -20}, {"x": 35, "y": 0, "z": -20}],
                "hiders": 14
            },
            "palette": [
                {"name": "붉은벽돌의자", "hex": "#9e2a2b"},
                {"name": "무대원목", "hex": "#8c5a2b"},
                {"name": "흡음패널", "hex": "#d8d4cd"},
                {"name": "스크린천", "hex": "#f4f1de"},
                {"name": "방음문철제", "hex": "#3d405b"}
            ]
        },
        "computer_lab": {
            "name": "컴퓨터실",
            "english_id": "computer_lab",
            "icon": "🖥️",
            "room_dimensions": {"width": 110, "height": 26, "depth": 90},
            "theme_elements": {
                "teacher_zone": {
                    "desk_pos": {"x": 0, "y": 0, "z": -32},
                    "podium": True,
                    "screen": {"width": 45, "height": 18, "pos": {"x": 0, "y": 14, "z": -44}},
                    "projector": {"pos": {"x": 0, "y": 22, "z": -15}}
                },
                "student_stations": {
                    "total_pcs": 24,
                    "left_group": {"cols": 4, "rows": 3, "count": 12, "x_center": -25},
                    "right_group": {"cols": 4, "rows": 3, "count": 12, "x_center": 25},
                    "center_aisle_width": 18, # 중앙 통로
                    "desk_color": "#6e4727", # 갈색 책상
                    "components_per_station": [
                        "16:9 slim monitor", "tower PC under desk", "keyboard & mousepad", "office chair"
                    ]
                }
            },
            "estimated_colliders": 160, # 책상 12세트, 타워본체, 의자 충돌체
            "estimated_meshes": 520,
            "spawn_points": {
                "seeker": [{"x": 0, "y": 0, "z": -30}, {"x": 0, "y": 0, "z": 0}, {"x": 0, "y": 0, "z": 30}],
                "hiders": 16
            },
            "palette": [
                {"name": "책상갈색목재", "hex": "#6e4727"},
                {"name": "모니터베젤블랙", "hex": "#1f1f1f"},
                {"name": "타워본체스틸", "hex": "#2e2e2e"},
                {"name": "키보드키캡", "hex": "#111111"},
                {"name": "마우스패드블루", "hex": "#1d3557"},
                {"name": "바닥비닐타일", "hex": "#d1ccc0"}
            ]
        },
        "elementary_library_renewal": {
            "name": "초등 도서실 (리뉴얼/확장)",
            "english_id": "library_elem",
            "icon": "📖",
            "room_dimensions": {"width": 120, "height": 28, "depth": 100},
            "theme_elements": {
                "bookcases": {
                    "type": "colorful_children_books",
                    "height": "low_and_medium", # 초등 눈높이
                    "gap_hiding_slots": 18, # 책 틈새 은신처
                    "book_spines_colors": ["#e63946", "#f4a261", "#2a9d8f", "#457b9d", "#e76f51", "#8338ec"]
                },
                "reading_zones": {
                    "floor_sitting_zone": { # 좌식 공간
                        "size": {"width": 35, "depth": 25},
                        "raised_mat_y": 0.5,
                        "color": "#faedcd",
                        "cushions": 8,
                        "low_tables": 3
                    },
                    "standard_reading_zone": {
                        "tables": 4, "chairs_per_table": 4
                    },
                    "window_counter_bar": { # 벽/창가 카운터 바
                        "pos": "along_east_wall",
                        "width": 6, "depth": 70,
                        "high_chairs": 8
                    }
                },
                "self_checkout_kiosk": {
                    "count": 2,
                    "barcode_scanner": True,
                    "color": "#48cae4",
                    "slot_hiding": True
                }
            },
            "estimated_colliders": 150,
            "estimated_meshes": 480,
            "spawn_points": {
                "seeker": [{"x": 0, "y": 0, "z": 0}, {"x": -30, "y": 0, "z": 20}, {"x": 30, "y": 0, "z": -20}],
                "hiders": 16
            },
            "palette": [
                {"name": "좌식원목마루", "hex": "#faedcd"},
                {"name": "동화책원색빨강", "hex": "#e63946"},
                {"name": "동화책노랑", "hex": "#f4a261"},
                {"name": "동화책청록", "hex": "#2a9d8f"},
                {"name": "카운터책상", "hex": "#d4a373"},
                {"name": "무인대출기민트", "hex": "#48cae4"}
            ]
        }
    }

    out_path = os.path.join("intermediate_results", "new_maps_specification.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(specs, f, indent=2, ensure_ascii=False)
    print(f"Specification saved successfully: {out_path}")
    print(f"Total maps specified: {len(specs)}")

if __name__ == "__main__":
    calculate_specs()
