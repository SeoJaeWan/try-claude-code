import test from "node:test";
import assert from "node:assert/strict";

import { readJson, runCli, tcpBin, tcfBin } from "./test-utils.mjs";

test("기본 help payload는 탐색용 summary JSON을 반환한다", () => {
  const result = runCli(tcpBin, ["--help"]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.helpMode, "summary");
  assert.equal("rules" in payload, false);
  assert.equal(payload.commands.component.detailHelp, "tcp component --help");
  assert.match(
    payload.commands.component.whenToUse[0],
    /When you need a new UI component shell/
  );
  assert.equal(payload.flows["new-component"].steps[0].command, "component");
});

test("guide 명령은 기본적으로 사람용 텍스트를 반환한다", () => {
  const result = runCli(tcpBin, ["guide", "component"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /퍼블리셔 personal v1 규칙/);
  assert.match(result.stdout, /컴포넌트 이름은 PascalCase를 사용한다/);
  assert.match(result.stdout, /레거시 경로가 현재 컨벤션과 다르면/);
  assert.match(result.stdout, /\[component\]/);
});

test("guide 명령은 --json일 때 guide 구조를 JSON으로 반환한다", () => {
  const result = runCli(tcfBin, ["guide", "hook", "--json"]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.commands.hook.description, "Generate a non-API hook file");
  assert.equal(payload.commands.hook.guide["목적"], "일반 훅 파일 껍질을 생성한다.");
  assert.deepEqual(payload.commands.hook.required, ["name", "path"]);
});

test("guide 명령은 더 이상 --html 옵션을 허용하지 않는다", () => {
  const result = runCli(tcpBin, ["guide", "--html"]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "UNKNOWN_OPTION");
  assert.match(payload.error.message, /Unknown option for guide: --html/);
});

test("help --text는 top-level summary를 간결한 텍스트로 보여준다", () => {
  const result = runCli(tcpBin, ["--help", "--text"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /summary: Publisher personal v1 rules for UI shells and interaction state\./);
  assert.match(result.stdout, /flows:/);
  assert.match(result.stdout, /new-component: Create a new UI component/);
  assert.match(result.stdout, /detail: tcp component --help/);
  assert.doesNotMatch(result.stdout, /required: name, path/);
});

test("command-scoped help --text는 요청한 명령만 요약해서 보여준다", () => {
  const result = runCli(tcpBin, ["component", "--help", "--text"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /component: Generate a publisher UI component file/);
  assert.match(result.stdout, /required: name, path/);
  assert.doesNotMatch(result.stdout, /^type:/m);
  assert.doesNotMatch(result.stdout, /^uiState:/m);
});

test("validate-file help --text는 파일 입력 형태와 검증 범위를 보여준다", () => {
  const result = runCli(tcpBin, ["validate-file", "--help", "--text"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /validate-file: Validate publisher UI files against placement and AST rules/);
  assert.match(result.stdout, /input: positional/);
  assert.match(result.stdout, /directory: <path> \(positional\)/);
  assert.match(result.stdout, /entry file: page\.tsx for app pages, index\.tsx for other React TSX component entries/);
  assert.match(result.stdout, /validates: .*page\.tsx keeps the page filename/);
  assert.match(result.stdout, /validates: .*components segment prefixes are preserved in validation and suggestions/);
  assert.match(result.stdout, /validates: file\/folder segment camelCase/);
});

test("legacy help subcommand 문법은 일반 unknown command로 실패한다", () => {
  const result = runCli(tcpBin, ["help", "component"]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "UNKNOWN_COMMAND");
  assert.equal(payload.error.details.command, "help");
});

test("help --full은 전체 detailed contract JSON을 유지한다", () => {
  const result = runCli(tcpBin, ["--help", "--full"]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.helpMode, "detail");
  assert.equal(
    payload.commands.component.contracts.pathPolicy.placementDecision,
    "common is only for components reused in 2 or more root page domains; otherwise choose the single matching domain path"
  );
});
