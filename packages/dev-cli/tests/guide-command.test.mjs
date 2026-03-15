import test from "node:test";
import assert from "node:assert/strict";

import { readJson, runCli, tcpBin, tcfBin } from "./test-utils.mjs";

test("기본 help payload에는 사람용 guide가 포함되지 않는다", () => {
  const result = runCli(tcpBin, ["--help"]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal("guide" in (payload.commands.component ?? {}), false);
});

test("guide 명령은 기본적으로 사람용 텍스트를 반환한다", () => {
  const result = runCli(tcpBin, ["guide", "component"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /퍼블리셔 personal v1 규칙/);
  assert.match(result.stdout, /컴포넌트 이름은 PascalCase를 사용한다/);
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
