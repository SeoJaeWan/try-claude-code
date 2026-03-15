import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..", "..", "..");
const tcpBin = path.join(repoRoot, "packages", "dev-cli", "bin", "tcp.mjs");

test("tcp --help defaults to json", () => {
  const result = spawnSync(process.execPath, [tcpBin, "--help"], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.alias, "tcp");
  assert.equal(payload.role, "publisher");
  assert.ok(payload.commands.component);
});

test("tcp --help --text renders human text", () => {
  const result = spawnSync(process.execPath, [tcpBin, "--help", "--text"], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /tcp -> publisher\/personal\/v1/);
  assert.match(result.stdout, /component: Generate a publisher UI component/);
});
