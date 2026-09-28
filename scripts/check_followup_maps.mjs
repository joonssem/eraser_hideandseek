/**
 * 🧪 scripts/check_followup_maps.mjs
 *
 * 신규 맵 3종(av_room, computer_lab, library_elem) 및 핵심 회귀 일괄 자동화 검증 스크립트
 * - 5단계 작업 지시서(docs/17_agy_task_05_documentation_and_integration_preparation.md) 준수
 * - 하위 명령 8종 순차 실행 및 비정상 종료 감지
 * - 신규 맵 3종의 ID 및 4대 export 정합성 검사
 * - maps/preview.html 등록 무결성 전수 검사
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("  🚀 [5단계 통합 전] 신규 맵 3종 및 전체 회귀 일괄 자동화 검증");
console.log("================================================================================\n");

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    totalPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    totalFailed++;
  }
}

// ─────────────────────────────────────────────────────────────────
// 1. 신규 맵 모듈 3종 동적 import 및 4대 export 인터페이스 정합성 검사
// ─────────────────────────────────────────────────────────────────
console.log("[1] 신규 맵 모듈 3종 export 인터페이스 정합성 검사");

const EXPECTED_MAPS = [
  {
    file: "maps/av_room.js",
    id: "av_room",
    metaExport: "AV_ROOM_MAP",
    buildExport: "buildAvRoom",
    updateExport: "updateAvRoomGimmicks",
    cleanupExport: "cleanupAvRoom"
  },
  {
    file: "maps/computer_lab.js",
    id: "computer_lab",
    metaExport: "COMPUTER_LAB_MAP",
    buildExport: "buildComputerLab",
    updateExport: "updateComputerLabGimmicks",
    cleanupExport: "cleanupComputerLab"
  },
  {
    file: "maps/library_elem.js",
    id: "library_elem",
    metaExport: "LIBRARY_ELEM_MAP",
    buildExport: "buildLibraryElem",
    updateExport: "updateLibraryElemGimmicks",
    cleanupExport: "cleanupLibraryElem"
  }
];

for (const spec of EXPECTED_MAPS) {
  const fullPath = path.join(ROOT_DIR, spec.file);
  try {
    const mod = await import(`file://${fullPath.replace(/\\/g, "/")}`);
    assert(mod[spec.metaExport] !== undefined, `${spec.file}: ${spec.metaExport} 메타데이터 export 확인`);
    assert(mod[spec.metaExport]?.id === spec.id, `${spec.file}: 메타데이터 id === '${spec.id}' 일치 확인`);
    assert(typeof mod[spec.buildExport] === "function", `${spec.file}: ${spec.buildExport}() build 함수 export 확인`);
    assert(typeof mod[spec.updateExport] === "function", `${spec.file}: ${spec.updateExport}() update 함수 export 확인`);
    assert(typeof mod[spec.cleanupExport] === "function", `${spec.file}: ${spec.cleanupExport}() cleanup 함수 export 확인`);
  } catch (err) {
    console.error(`  ❌ 모듈 로드 실패: ${spec.file}`, err);
    totalFailed++;
  }
}

// ─────────────────────────────────────────────────────────────────
// 2. maps/preview.html 등록 무결성 검사
// ─────────────────────────────────────────────────────────────────
console.log("\n[2] maps/preview.html 등록 무결성 검사");
const previewPath = path.join(ROOT_DIR, "maps", "preview.html");
const previewContent = fs.readFileSync(previewPath, "utf-8");

for (const spec of EXPECTED_MAPS) {
  // A. <select> 옵션 등록 확인
  const optRegex = new RegExp(`<option\\s+value=["']${spec.id}["']`, "g");
  const optMatches = previewContent.match(optRegex) || [];
  assert(optMatches.length === 1, `preview.html: <option value="${spec.id}"> 정확히 1회 등록 확인 (실제: ${optMatches.length}회)`);

  // B. AVAILABLE_MAPS 등록 확인
  const regKeyRegex = new RegExp(`\\b${spec.id}\\s*:\\s*\\{`, "g");
  const regMatches = previewContent.match(regKeyRegex) || [];
  assert(regMatches.length === 1, `preview.html: AVAILABLE_MAPS.${spec.id} 등록 정확히 1회 확인 (실제: ${regMatches.length}회)`);
}

// ─────────────────────────────────────────────────────────────────
// 3. 8종 검증 하위 프로세스 순차 실행 및 무결성 확인
// ─────────────────────────────────────────────────────────────────
console.log("\n[3] 8대 필수 검증 프로세스 순차 실행");

const COMMANDS = [
  { cmd: "node --check maps/av_room.js", desc: "maps/av_room.js 구문 검사" },
  { cmd: "node --check maps/computer_lab.js", desc: "maps/computer_lab.js 구문 검사" },
  { cmd: "node --check maps/library_elem.js", desc: "maps/library_elem.js 구문 검사" },
  { cmd: "node scripts/check_av_room.mjs", desc: "시청각실(av_room) 모듈 전수 검증" },
  { cmd: "node scripts/check_computer_lab.mjs", desc: "컴퓨터실(computer_lab) 모듈 전수 검증" },
  { cmd: "node scripts/check_library_elem.mjs", desc: "초등 도서실(library_elem) 모듈 전수 검증" },
  { cmd: "node scripts/check_care_room.mjs", desc: "돌봄교실(care_room) 회귀 검증" },
  { cmd: "python scripts/98_check_preview_script.py", desc: "preview.html 인라인/모듈 문법 검사" }
];

let allCommandsPassed = true;

for (let i = 0; i < COMMANDS.length; i++) {
  const { cmd, desc } = COMMANDS[i];
  console.log(`\n  [실행 ${i + 1}/${COMMANDS.length}] ${cmd} (${desc})`);
  try {
    const stdout = execSync(cmd, {
      cwd: ROOT_DIR,
      stdio: "pipe",
      encoding: "utf-8"
    });
    // 통과 로그 요약 출력
    console.log(`  -> 성공 (종료 코드: 0)`);
    totalPassed++;
  } catch (err) {
    console.error(`  ❌ 명령 실패: ${cmd}`);
    console.error(`     종료 코드: ${err.status}`);
    if (err.stdout) console.error(`     표준 출력:\n${err.stdout}`);
    if (err.stderr) console.error(`     표준 에러:\n${err.stderr}`);
    totalFailed++;
    allCommandsPassed = false;
    break; // 실패 시 즉시 중단
  }
}

console.log("\n================================================================================");
console.log(`  최종 결과: ${totalPassed}건 검증 통과, ${totalFailed}건 실패`);
console.log("================================================================================");

if (allCommandsPassed && totalFailed === 0) {
  console.log("🎉 신규 맵 3종 및 전체 회귀 일괄 검증 100% 통과 완료!\n");
  process.exit(0);
} else {
  console.error("💥 일부 검증 항목이 실패했습니다.\n");
  process.exit(1);
}
