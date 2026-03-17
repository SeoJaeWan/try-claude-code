import test from "node:test";
import assert from "node:assert/strict";

import { readJson, runCli, tcpBin, tcfBin } from "./test-utils.mjs";

test("spec-driven command는 --json 입력을 받고 기본적으로 파일 preview를 반환한다", () => {
  const result = runCli(tcpBin, [
    "component",
    "--json",
    "{\"name\":\"HelpContractPreviewCard\",\"path\":\"components/common/helpContractPreviewCard\"}"
  ]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.command, "component");
  assert.equal(payload.normalizedSpec.name, "HelpContractPreviewCard");
  assert.equal(
    payload.files[0].path,
    "components/common/helpContractPreviewCard/index.tsx"
  );
  assert.equal(payload.files[0].status, "planned");
});

test("legacy positional 입력은 명시적인 JSON spec 오류를 반환한다", () => {
  const result = runCli(tcpBin, [
    "component",
    "HomePage",
    "--path",
    "components/common/homePage"
  ]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "JSON_SPEC_REQUIRED");
});

test("성공 payload는 normalizedSpec과 snippet result 필드를 유지한다", () => {
  const result = runCli(tcfBin, [
    "function",
    "--json",
    "{\"kind\":\"internalHandler\",\"name\":\"onClick\"}"
  ]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.normalizedSpec.name, "handleClick");
  assert.equal(payload.result.kind, "snippet");
});

test("실패 payload도 deterministic error envelope를 유지한다", () => {
  const result = runCli(tcfBin, [
    "function",
    "--json",
    "{\"kind\":\"internalHandler\",\"name\":\"handleSubmit\",\"action\":\"click\"}"
  ]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "SPEC_CONFLICT");
});

test("tcf 기본 help JSON은 탐색용 summary를 반환한다", () => {
  const result = runCli(tcfBin, ["--help"]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.helpMode, "summary");
  assert.equal(payload.commands.apiHook.cliCommand, "api-hook");
  assert.match(payload.commands.apiHook.whenToUse[0], /When you need a TanStack Query-based server request hook/);
  assert.deepEqual(
    payload.commands.apiHook.relatedCommands.map((entry) => entry.command),
    ["query-key", "endpoint", "mapper", "hook-return", "validate-file", "batch"]
  );
  assert.deepEqual(payload.commands.apiHook.flowRefs, ["create-api-hook", "bulk-frontend-scaffold"]);
  assert.equal(payload.flows["create-api-hook"].steps[0].command, "query-key");
});

test("tcp 기본 help JSON은 명령 사용 맥락을 summary로 노출한다", () => {
  const result = runCli(tcpBin, ["--help"]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.helpMode, "summary");
  assert.equal(payload.commands.component.cliCommand, "component");
  assert.match(payload.commands.component.whenToUse[0], /When you need a new UI component shell/);
  assert.deepEqual(
    payload.commands.component.relatedCommands.map((entry) => entry.command),
    ["validate-file", "ui-state", "batch"]
  );
  assert.deepEqual(payload.commands.component.flowRefs, [
    "new-component",
    "add-ui-interaction",
    "bulk-publisher-update"
  ]);
  assert.equal(payload.flows["new-component"].steps[1].command, "validate-file");
});

test("tcp help component JSON은 요청한 명령 계약만 구조적으로 노출한다", () => {
  const result = runCli(tcpBin, ["component", "--help"]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.helpMode, "detail");
  assert.deepEqual(Object.keys(payload.commands), ["component"]);
  assert.equal(
    payload.commands.component.contracts.pathPolicy.placementDecision,
    "common is only for components reused in 2 or more root page domains; otherwise choose the single matching domain path"
  );
  assert.equal(
    payload.commands.component.contracts.pathPolicy.legacyPolicy,
    "if a legacy component path differs from the current convention, migrate the path first; if it already matches, keep the path and only update internals"
  );
});

test("tcp --help --full은 전체 command contract audit용 JSON을 반환한다", () => {
  const result = runCli(tcpBin, ["--help", "--full"]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.helpMode, "detail");
  assert.deepEqual(
    payload.commands.component.contracts.pathPolicy.requiredPatterns,
    [
      "*/components/common/{component}",
      "*/components/{domain}/{component}"
    ]
  );
  assert.equal(
    payload.commands.validateFile.contracts.outputPolicy.entryFilePattern,
    "page.tsx for app pages, index.tsx for other React TSX component entries"
  );
  assert.equal(payload.commands.validateFile.contracts.inputShape.directoryField, "<path>");
  assert.equal(payload.commands.validateFile.targetRules[0].commandName, "component");
  assert.equal(payload.commands.validateFile.targetRules[0].pathRules[0].kind, "pathSegmentCase");
});

test("tcf --help --full은 fieldResolver와 validateFile target rule도 노출한다", () => {
  const result = runCli(tcfBin, ["--help", "--full"]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.commands.apiHook.fieldResolvers[0].source, "namePrefixMap");
  assert.equal(payload.commands.validateFile.contracts.inputShape.directoryField, "<path>");
  assert.equal(payload.commands.validateFile.targetRules[0].commandName, "hook");
});

test("tcp component는 common 또는 domain segment 없는 경로를 거부한다", () => {
  const result = runCli(tcpBin, [
    "component",
    "--json",
    "{\"name\":\"Button\",\"path\":\"components/button\"}"
  ]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "INVALID_COMPONENT_PATH");
});

test("tcp component는 prefix가 있어도 마지막 components 세그먼트 아래 경로를 허용한다", () => {
  const result = runCli(tcpBin, [
    "component",
    "--json",
    "{\"name\":\"ReviewCard\",\"path\":\"src/components/common/reviewCard\"}"
  ]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(
    payload.files[0].path,
    "src/components/common/reviewCard/index.tsx"
  );
});
