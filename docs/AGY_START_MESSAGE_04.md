# AGY 시작 안내 메시지 04

아래 문서를 UTF-8로 처음부터 끝까지 읽고 **4단계 초등 도서실 `library_elem` 작업만** 수행하세요.

- `docs/16_agy_task_04_elementary_library.md`
- 상위 기준: `docs/12_agy_train_fix_and_new_spaces_checklist.md`

3단계 컴퓨터실은 2026-09-28 Codex `PASS`를 받았으므로 4단계 시작을 승인합니다.

작업 전 `main` 브랜치, HEAD `51424ea`, `git status --short`를 확인하세요. 이번 승인 과정에서 변경된 `docs/12_agy_train_fix_and_new_spaces_checklist.md`, `docs/README.md`, `docs/16_agy_task_04_elementary_library.md`, `docs/AGY_START_MESSAGE_04.md`는 예상된 문서 변경이므로 그대로 보존하세요. 이 네 문서 외에 예상하지 못한 변경이 있으면 수정하지 말고 보고 후 대기하세요.

허용 범위는 신규 `maps/library_elem.js`, 신규 `scripts/check_library_elem.mjs`, `maps/preview.html`의 최소 등록 변경, `maps/README.md`의 최소 목록 변경입니다. 배포 HTML, 기존 맵, 기존 검사, 체크리스트 상태는 수정하지 마세요.

지시서에 명시된 정적·수치·반복 재빌드·교차 전환·브라우저 검증을 실제로 실행하고 증거를 남기세요. GUI를 실행하지 못하면 통과로 추정하지 말고 미실행 사유를 보고하세요. 스크린샷과 로그는 저장소가 아닌 AGY 아티팩트 디렉터리에 저장하세요.

완료 후 지시서의 `[AGY 단계 완료 보고]` 형식으로 실제 명령 출력, 변경 파일, 수량, 스폰-AABB 검사, 3회 재빌드, 8개 맵 회귀 및 육안 증거 경로를 보고하고 즉시 멈추세요. Codex가 `PASS`하기 전에는 5단계 문서·통합 준비를 시작하지 마세요.
