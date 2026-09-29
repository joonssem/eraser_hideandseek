# 프로젝트 문서

이 폴더는 게임의 기획, 개발 판단, 현장 시험 결과와 후속 아이디어를 지속적으로 기록하는 문서 공간입니다.

## 문서 목록

1. [프로젝트 기획 및 분석](./01_project_planning_and_analysis.md)
   - 기존 기능 분석과 수정 이력
   - 메챠 카멜레온 참고 로드맵
   - 모바일 조작 개선
   - 베이직·감염 모드의 설계 및 구현 기록
   - 향후 더블 모드와 신규 맵 개발 방향

2. [게임 모드 현장 시험표](./02_game_mode_field_test.md)
   - 20~21명 학급 기준 시험 조건
   - 감염 모드 난이도 조정 절차
   - 라운드 기록표와 판정 기준

3. [신규 맵(공간) 기획 및 아이디어](./03_new_map_ideas.md)
   - 초등학교 특화 5종 공간 상세 기획 (미술실, 체육관, 음악실, 보건실, 돌봄교실)
   - 공간별 3D 오브젝트, 스포이드 위장 포인트 및 특화 기믹
   - 개발 우선순위 및 Zero-Asset 절차적 모델링 가이드

4. [신규 맵 아이디어 원본 초안](./04_new_map_ideas_original_draft.md)
   - 루트에 작성되어 있던 `MAP_IDEAS.md` 원문 보존본
   - 정리본과 비교하거나 아이디어의 최초 표현을 확인할 때 사용

5. [신규 맵 모듈화 아키텍처 및 상세 개발 명세서](./05_new_maps_specification.md)
   - 의존성 주입(ctx) 패턴 및 맵 생명주기(build, updateGimmicks, cleanup)
   - 5종 맵 상세 3D 규격 및 기믹 스펙
   - index.html(커밋 34fe2a0 기준) 무결성 보존 통합 가이드

6. [AGY 신규 맵 개발·검증 체크리스트](./06_agy_map_development_checklist.md)
   - AGY(Antigravity, Gemini 3.8 Flash High)가 순서대로 수행할 단계별 지시
   - 단계마다 AGY가 증거를 제출하고 Codex가 독립 검증하는 작업 절차
   - 현재 남은 작업, 엔진 계약 전 보류 기능, 미술실 교정부터 최종 통합까지의 완료 기준

7. [신규 맵 개발 진행 기록 (2026-09-21)](./07_map_development_progress_2026-09-21.md)
   - 미술실 기준 정리, 프리뷰, 체육관, 음악실 단계별 결과와 Codex 판정
   - 자동화 검사 재현성 메모와 다음 순위 작업

8. [메챠 카멜레온 조사 인사이트 및 타이틀 화면 디자인 분석](./08_meccha_chameleon_insights_and_title_design.md)
   - 원작 벤치마킹 대상의 처음 화면(타이틀/로비) 비주얼 및 진입 플로우 분석
   - 게임의 핵심 위장 규칙을 첫 화면에서 직관화하는 디자인(Show, Don't Tell)
   - '지우개 숨바꼭질' 프로젝트의 타이틀 3D 프리뷰 및 로비 UI 적용 인사이트

9. [신규 맵 5종 정식 통합 제안서](./09_new_maps_integration_proposal.md)
   - index.html을 수정하기 전 검토한 실제 통합 지점과 적용 결과
   - 외부 ES 모듈 배포 제약, 위험 대응, 롤백 및 전체 회귀 테스트 계획

10. [돌봄교실 장난감 기차 버그 분석 및 수정 계획서](./10_care_room_train_bug_analysis_and_fix_plan.md)
    - 기차 진행 방향 왜곡(-90도 게걸음) 및 36유닛 Z축 순간이동 원인 규명
    - 완전 연속성 보장 교정 수식 및 전수 검사 결과
    - maps/care_room.js 수정 패치 계획

11. [신규 맵 아이디어 3종 및 3D 레벨 디자인 명세서](./11_additional_map_ideas_and_level_design.md)

12. [AGY 후속 작업 체크리스트 — 돌봄교실 기차 수정 및 신규 공간 3종](./12_agy_train_fix_and_new_spaces_checklist.md)

13. [AGY 작업 지시서 01 — 돌봄교실 장난감 기차 궤적 수정](./13_agy_task_01_care_room_train_fix.md)

별도 전달용: [AGY 시작 안내 메시지 01](./AGY_START_MESSAGE_01.md)

14. [AGY 작업 지시서 02 — 시청각실 av_room 독립 모듈 구현](./14_agy_task_02_av_room.md)

별도 전달용: [AGY 시작 안내 메시지 02](./AGY_START_MESSAGE_02.md)

15. [AGY 작업 지시서 03 — 컴퓨터실 computer_lab 독립 모듈 구현](./15_agy_task_03_computer_lab.md)

별도 전달용: [AGY 시작 안내 메시지 03](./AGY_START_MESSAGE_03.md)
    - 시청각실 (간이 무대, 롤스크린 뒤 은신, 스타디움식 붉은 벽돌 접이식 의자)
    - 컴퓨터실 (중앙 통로 24석 PC, 타워 본체 케이블 및 모니터 뒤 은신)
    - 초등 도서실 확장 (알록달록 동화책 틈새, 온돌 좌식 마루, 무인 대출기 키오스크)

16. [AGY 작업 지시서 04 — 초등 도서실 library_elem 독립 모듈 구현](./16_agy_task_04_elementary_library.md)

별도 전달용: [AGY 시작 안내 메시지 04](./AGY_START_MESSAGE_04.md)

17. [AGY 작업 지시서 05 — 신규 맵 3종 문서 정리 및 정식 통합 준비](./17_agy_task_05_documentation_and_integration_preparation.md)

별도 전달용: [AGY 시작 안내 메시지 05](./AGY_START_MESSAGE_05.md)

18. [신규 맵 3종 정식 통합 제안서 및 롤백 계획](./18_followup_maps_integration_proposal.md)

19. [AGY 작업 지시서 06 — 신규 맵 3종 정식 통합](./19_agy_task_06_followup_maps_integration.md)

별도 전달용: [AGY 시작 안내 메시지 06](./AGY_START_MESSAGE_06.md)

20. [신규 공간 3종 후속 작업 완료 보고 — 2026-09-28](./20_followup_maps_completion_report_2026-09-28.md)

21. [시청각실 및 컴퓨터실 2차 고도화 명세서 (현장 실전 피드백)](./21_av_room_and_computer_lab_enhancement_spec.md)
    - 컴퓨터실: 모니터 6종 화면 다양화, 마우스 착시 오브젝트, 미정리 키보드/의자 3~4석, 교실 뒷편 책장 및 헤드셋 보관함
    - 시청각실: 열려 있는 의자 5석, 의자 밑 끼임/클리핑 오류 완벽 수정, 무대 좌측 검정 업라이트 피아노, 프로젝터 라인 무대 조명 6기(1기 고장 깜빡임) 및 차광판(반도어)

22. [시청각실 및 컴퓨터실 2차 고도화 실행 체크리스트 및 우선순위](./22_av_room_and_computer_lab_enhancement_checklist.md)
    - 5단계 우선순위 체계 (P0 물리 버그 수정 -> P1 대형 구조물 -> P2 심리전 소품 -> P3 시각/동적 연출 -> P4 전체 회귀 검증)
    - 단계별 실행 체크리스트 및 상태 추적표

23. [AGY 작업 지시서 07 — P1 대형 가구 배치 및 AABB 동기화](./23_agy_task_07_p1_large_furniture_and_aabb.md)
    - 시청각실 업라이트 피아노·펼쳐진 의자 5석과 컴퓨터실 미정리 키보드/의자·후방 수납 구조 구현
    - P0 회귀 보존, 실제 빌드 결과 기반 검사, 브라우저 검증 및 Codex 승인 전 P2 중단 조건

별도 전달용: [AGY 시작 안내 메시지 07](./AGY_START_MESSAGE_07.md)

24. [AGY 작업 지시서 08 — 추가 현장 피드백 및 P1 보완](./24_agy_task_08_feedback_supplement.md)
    - 음향 앰프·마이크·믹서, 컴퓨터실 후방 예비 주변기기·도구 및 자격증 게시판 보완
    - P2 마우스 20개와 P3 모니터 전원 상태/무대 조명 요구를 갱신하고 단계별 승인 게이트 유지

별도 전달용: [AGY 시작 안내 메시지 08](./AGY_START_MESSAGE_08.md)

25. [시청각실 및 컴퓨터실 2차 고도화 완료 보고서 (P0~P4)](./25_av_room_and_computer_lab_enhancement_completion_report.md)
    - 의자 하부 충돌 방지, 대형 가구·장비, 마우스 20개, 모니터 화면 다양화 및 무대 조명 구현 결과와 회귀 검사 기록

25. [시청각실 및 컴퓨터실 2차 고도화(P0~P4) 완료 보고서](./25_av_room_and_computer_lab_enhancement_completion_report.md)
    - [P0] 의자 하부 12개 블로커 및 런타임 576회 침투 시도 100% 차단
    - [P1] 피아노·펼쳐진 의자 5석·음향랙/믹서/마이크, 미정리 키보드/의자 4석, 후방 책장/헤드셋 10개/예비장비/게시판
    - [P2] 책상 위 마우스 20개 (중앙 인접 4석 비움)
    - [P3] 컴퓨터실 모니터 전원 18 ON/3 Sleep/3 OFF & 6종 UI 화면, 시청각실 조명 6기 & 반도어 & 1번 깜빡임
    - [P4] 8대 자동화 검증 100% PASS

## 기록 원칙

- 새로운 기능은 구현 전에 목적, 대상 학생, 사용 시점과 예상 난이도를 기록합니다.
- 구현 후에는 적용 파일, 핵심 규칙과 자동 검사 결과를 남깁니다.
- 실제 수업 결과는 참여 인원, 모드, 승패, 생존자 수와 특이사항을 기록합니다.
- 확정되지 않은 아이디어와 현재 배포된 기능을 명확하게 구분합니다.
- 더 이상 사용하지 않는 계획은 삭제하지 않고 `폐기·보류` 상태와 이유를 표시합니다.

## 루트 문서

- [프로젝트 소개 및 실행 안내](../README.md)
- [Firebase 서버 구축 및 배포 가이드](../guide.md)
