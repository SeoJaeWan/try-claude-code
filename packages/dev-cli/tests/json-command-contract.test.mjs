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

test("tcf help JSON은 hook/apiHook 계약을 AI가 읽을 수 있는 구조로 노출한다", () => {
  const result = runCli(tcfBin, ["--help"]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.deepEqual(
    payload.commands.hook.contracts.pathPolicy.allowedPatterns,
    ["hooks/utils/{domain}", "hooks/utils/common"]
  );
  assert.equal(
    payload.commands.apiHook.contracts.methodPolicy.query.requiredMethod,
    "GET"
  );
  assert.deepEqual(
    payload.commands.apiHook.contracts.methodPolicy.mutation.allowedMethods,
    ["POST", "PUT", "PATCH", "DELETE"]
  );
  assert.equal(
    payload.commands.apiHook.contracts.namingPolicy.mutationPatterns.PATCH,
    "^usePatch[A-Z][A-Za-z0-9]*$"
  );
  assert.equal(
    payload.commands.hook.contracts.pathPolicy.domainPolicy,
    "domain is the root page segment from app/{domain}; use common only for hooks shared across multiple page domains"
  );
  assert.equal(
    payload.commands.apiHook.contracts.pathPolicy.domainExamples["app/login/page.tsx"],
    "login"
  );
  assert.equal(
    payload.commands.validateFile.contracts.outputPolicy.entryFilePattern,
    "index.ts"
  );
  assert.deepEqual(
    payload.commands.validateFile.contracts.inputShape.acceptedModes,
    ["positional", "json"]
  );
});

test("tcp help JSON은 publisher component 계약을 AI가 읽을 수 있는 구조로 노출한다", () => {
  const result = runCli(tcpBin, ["--help"]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.deepEqual(
    payload.commands.component.contracts.pathPolicy.requiredPatterns,
    [
      "components/common/{component}",
      "components/{domain}/{component}"
    ]
  );
  assert.equal(
    payload.commands.component.contracts.pathPolicy.domainPolicy,
    "domain is the root page segment from app/{domain}; use common only for components shared across multiple page domains"
  );
  assert.equal(
    payload.commands.component.contracts.pathPolicy.placementDecision,
    "common is only for components reused in 2 or more root page domains; otherwise choose the single matching domain path"
  );
  assert.equal(
    payload.commands.component.contracts.pathPolicy.legacyPolicy,
    "if a legacy component path differs from the current convention, migrate the path first; if it already matches, keep the path and only update internals"
  );
  assert.equal(
    payload.commands.component.contracts.outputPolicy.functionStyle,
    "arrow"
  );
  assert.equal(
    payload.commands.component.contracts.outputPolicy.filePattern,
    "{path}/index.tsx"
  );
  assert.equal(
    payload.commands.component.contracts.pathPolicy.domainExamples["app/profile/page.tsx"],
    "profile"
  );
  assert.equal(
    payload.commands.validateFile.description,
    "Validate publisher UI files against placement and AST rules"
  );
  assert.deepEqual(
    payload.commands.validateFile.contracts.inputShape.acceptedModes,
    ["positional", "json"]
  );
  assert.ok(
    payload.commands.validateFile.contracts.validationCoverage.includes(
      "non-components path uses AST-only validation"
    )
  );
});

test("tcp help component JSON은 요청한 명령 계약만 구조적으로 노출한다", () => {
  const result = runCli(tcpBin, ["help", "component"]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
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
