import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { withTemporaryManifest } from "../lib/temporary-manifest.mjs";

function withTestManifest(run) {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-deploy-"));
  const manifestPath = path.join(testRoot, "plugin.json");
  const originalContents = '{\n  "name": "workbench",\n  "version": "0.3.0"\n}\n';
  fs.writeFileSync(manifestPath, originalContents);

  try {
    run({ manifestPath, originalContents });
  } finally {
    fs.rmSync(testRoot, { recursive: true, force: true });
  }
}

test("restores the exact source manifest after deployment", () => {
  withTestManifest(({ manifestPath, originalContents }) => {
    const deployedVersion = "0.3.0+codex.local-20260826-010203";

    withTemporaryManifest(
      manifestPath,
      { name: "workbench", version: deployedVersion },
      () => {
        const installedManifest = JSON.parse(
          fs.readFileSync(manifestPath, "utf8"),
        );
        assert.equal(installedManifest.version, deployedVersion);
      },
    );

    assert.equal(fs.readFileSync(manifestPath, "utf8"), originalContents);
  });
});

test("restores the source manifest when deployment fails", () => {
  withTestManifest(({ manifestPath, originalContents }) => {
    assert.throws(
      () =>
        withTemporaryManifest(
          manifestPath,
          { name: "workbench", version: "0.3.0+codex.failure" },
          () => {
            throw new Error("install failed");
          },
        ),
      /install failed/,
    );

    assert.equal(fs.readFileSync(manifestPath, "utf8"), originalContents);
  });
});
