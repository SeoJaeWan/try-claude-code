import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadActiveProfile } from "../src/core/profile-loader.mjs";
import { validateRequest } from "../src/core/profile-validator.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..", "..", "..");
const tcpBin = path.join(repoRoot, "packages", "dev-cli", "bin", "tcp.mjs");
const tcfBin = path.join(repoRoot, "packages", "dev-cli", "bin", "tcf.mjs");
const tcbBin = path.join(repoRoot, "packages", "dev-cli", "bin", "tcb.mjs");

test("tcp component dry-run computes page/homePage/index.tsx", () => {
  const result = spawnSync(
    process.execPath,
    [tcpBin, "component", "HomePage", "--path", "page/homePage", "--dry-run"],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.files[0].path, "page/homePage/index.tsx");
});

test("publisher validator rejects useEffect content", async () => {
  const { profile } = await loadActiveProfile({
    repoRoot,
    role: "publisher",
    mode: "personal",
    version: "v1"
  });

  await assert.rejects(
    () =>
      validateRequest({
        role: "publisher",
        profile,
        commandName: "component",
        args: {
          name: "HomePage",
          path: "page/homePage"
        },
        files: [
          {
            path: "page/homePage/index.tsx",
            content: "const HomePage = () => { useEffect(() => {}); return <div />; };"
          }
        ],
        repoRoot
      }),
    /Forbidden pattern found: useEffect/
  );
});

test("frontend apiHook path outside queries or mutations fails", () => {
  const result = spawnSync(
    process.execPath,
    [
      tcfBin,
      "apiHook",
      "useGetProduct",
      "--path",
      "hooks/apis/product/query",
      "--kind",
      "query",
      "--dry-run"
    ],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stderr);
  assert.equal(payload.error.code, "INVALID_API_PATH");
});

test("backend package path with uppercase fails", () => {
  const result = spawnSync(
    process.execPath,
    [
      tcbBin,
      "module",
      "Product",
      "--path",
      "Product",
      "--base-package",
      "com.example.app",
      "--dry-run"
    ],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stderr);
  assert.equal(payload.error.code, "INVALID_PACKAGE_SEGMENT");
});

test("spring root package missing returns explicit error", () => {
  const result = spawnSync(
    process.execPath,
    [tcbBin, "module", "Product", "--path", "product", "--dry-run"],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stderr);
  assert.equal(payload.error.code, "ROOT_PACKAGE_NOT_FOUND");
});
