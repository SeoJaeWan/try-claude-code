import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";

import { readJson, runCli, tcpBin, tcfBin, tcbBin } from "./test-utils.mjs";

for (const [alias, binPath] of [
  ["tcp", tcpBin],
  ["tcf", tcfBin],
  ["tcb", tcbBin]
]) {
  test(`${alias} wrapper는 repo 밖 디렉터리에서도 기본 help JSON을 반환한다`, async () => {
    const tempProject = await mkdtemp(path.join(os.tmpdir(), `dev-cli-smoke-${alias}-`));
    const result = runCli(binPath, ["--help"], {
      cwd: tempProject
    });

    assert.equal(result.status, 0);
    const payload = readJson(result.stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.alias, alias);
  });
}
