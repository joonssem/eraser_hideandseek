# AGY 시작 안내 메시지 06

사용자와 Codex가 5단계를 승인했으므로 6단계 **신규 맵 3종 정식 통합**을 시작하세요.

먼저 다음 문서를 UTF-8로 처음부터 끝까지 읽고 그대로 수행하세요.

- `docs/19_agy_task_06_followup_maps_integration.md`
- 상위 기준: `docs/12_agy_train_fix_and_new_spaces_checklist.md`
- 승인된 통합안: `docs/18_followup_maps_integration_proposal.md`

대상은 `av_room`, `computer_lab`, `library_elem`입니다. `index.html`, `index (배포용).html`, `primary_data/index (배포용).html` 각각의 기존 구조를 보존하면서 신규 import 블록 3개와 `MAPS` 엔트리 3개만 수술적으로 추가하세요. 개발판 전체를 배포판에 복사하지 마세요.

맵 모듈, 프리뷰, 검사 스크립트, Firebase·네트워크·게임 로직은 수정하지 마세요. 기존 작업 트리 변경과 `future_projects/`를 보존하세요. `index (배포용).zip` 재생성, commit, push, merge도 금지합니다.

자동 검사 후 실제 브라우저에서 로비 카드, 연습 모드, 신규 맵 3종 재진입, 기존 맵 왕복과 콘솔 오류를 검증하세요. 가능한 경우 호스트 1명과 학생 2명의 맵 선택 동기화도 확인하되 실제 Firebase 규칙이나 데이터를 관리 목적으로 변경하지 마세요. 다인 검증이 불가능하면 미완료로 명확히 구분하세요.

완료 후 지시서의 보고 형식으로 결과와 저장소 밖 증거 경로를 제출하고 즉시 멈추세요. commit, push, ZIP 패키징은 Codex의 후속 판정 전 진행하지 마세요.
