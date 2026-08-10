import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDeployScript = path.resolve(pluginRoot, "..", "..", "scripts", "deploy-workbench-plugin.mjs");

async function createFixture(t) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "workbench-deploy-contract-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const scriptPath = path.join(root, "codex-plugin", "scripts", "deploy-workbench-plugin.mjs");
  const manifestPath = path.join(
    root,
    "codex-plugin",
    "plugins",
    "workbench",
    ".codex-plugin",
    "plugin.json",
  );
  await fsp.mkdir(path.dirname(scriptPath), { recursive: true });
  await fsp.mkdir(path.dirname(manifestPath), { recursive: true });
  await fsp.copyFile(sourceDeployScript, scriptPath);
  const manifestText = `${JSON.stringify(
    {
      name: "workbench",
      version: "0.1.0+codex.previous",
      description: "fixture",
    },
    null,
    2,
  )}\n`;
  await fsp.writeFile(manifestPath, manifestText);

  return { root, scriptPath, manifestPath, manifestText };
}

async function createFakeCodex(root) {
  const binRoot = path.join(root, "fake-bin");
  const logPath = path.join(root, "codex-invocations.log");
  await fsp.mkdir(binRoot, { recursive: true });

  const implementationPath = path.join(binRoot, "fake-codex.mjs");
  await fsp.writeFile(
    implementationPath,
    [
      'import fs from "node:fs";',
      "",
      "const args = process.argv.slice(2);",
      'fs.appendFileSync(process.env.FAKE_CODEX_LOG, `${args.join(" ")}\\n`);',
      "",
      'if (args.join(" ") === "plugin marketplace list --json") {',
      '  if (process.env.FAKE_CODEX_MODE === "preflight-failure") {',
      '    console.error("fake marketplace failure");',
      "    process.exit(29);",
      "  }",
      "",
      "  console.log(JSON.stringify([",
      "    {",
      '      name: "local-work",',
      "      source: {",
      '        kind: "local",',
      "        path: process.env.FAKE_MARKETPLACE_ROOT,",
      "      },",
      "    },",
      "  ]));",
      "  process.exit(0);",
      "}",
      "",
      'if (args.join(" ") === "plugin add workbench@local-work") {',
      "  process.exit(0);",
      "}",
      "",
      'console.error(`unexpected fake Codex invocation: ${args.join(" ")}`);',
      "process.exit(97);",
      "",
    ].join("\n"),
  );

  if (process.platform === "win32") {
    await fsp.writeFile(
      path.join(binRoot, "codex.cmd"),
      [
        "@echo off",
        'node "%~dp0fake-codex.mjs" %*',
        "",
      ].join("\r\n"),
    );
  } else {
    const executable = path.join(binRoot, "codex");
    await fsp.writeFile(
      executable,
      [
        "#!/bin/sh",
        'exec node "$(dirname "$0")/fake-codex.mjs" "$@"',
        "",
      ].join("\n"),
    );
    await fsp.chmod(executable, 0o755);
  }

  return { binRoot, logPath };
}

function fakeCodexEnvironment(fakeCodex, marketplaceRoot, mode = "success") {
  return {
    ...process.env,
    FAKE_CODEX_LOG: fakeCodex.logPath,
    FAKE_CODEX_MODE: mode,
    FAKE_MARKETPLACE_ROOT: marketplaceRoot,
    PATH: `${fakeCodex.binRoot}${path.delimiter}${process.env.PATH ?? ""}`,
  };
}

test("a failing Codex marketplace preflight exits before changing the cachebuster", async (t) => {
  const fixture = await createFixture(t);
  const fakeCodex = await createFakeCodex(fixture.root);
  const result = spawnSync(process.execPath, [fixture.scriptPath], {
    cwd: fixture.root,
    encoding: "utf8",
    env: fakeCodexEnvironment(
      fakeCodex,
      path.join(fixture.root, "codex-plugin"),
      "preflight-failure",
    ),
  });

  assert.equal(result.status, 29, result.stderr || result.stdout);
  assert.match(result.stderr, /preflight failed before the manifest cachebuster was changed/i);
  assert.equal(await fsp.readFile(fixture.manifestPath, "utf8"), fixture.manifestText);
  assert.equal(
    (await fsp.readFile(fakeCodex.logPath, "utf8")).trim(),
    "plugin marketplace list --json",
  );
});

test("marketplace preflight requires local-work to resolve to this checkout's codex-plugin root", async (t) => {
  const fixture = await createFixture(t);
  const fakeCodex = await createFakeCodex(fixture.root);
  const otherMarketplaceRoot = path.join(fixture.root, "other-checkout", "codex-plugin");
  await fsp.mkdir(otherMarketplaceRoot, { recursive: true });

  const result = spawnSync(process.execPath, [fixture.scriptPath], {
    cwd: fixture.root,
    encoding: "utf8",
    env: fakeCodexEnvironment(fakeCodex, otherMarketplaceRoot),
  });

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stderr, /local-work does not point at .*codex-plugin/i);
  assert.equal(await fsp.readFile(fixture.manifestPath, "utf8"), fixture.manifestText);
  assert.equal(
    (await fsp.readFile(fakeCodex.logPath, "utf8")).trim(),
    "plugin marketplace list --json",
  );
});

test("marketplace JSON for this checkout permits the install after preflight", async (t) => {
  const fixture = await createFixture(t);
  const fakeCodex = await createFakeCodex(fixture.root);
  const result = spawnSync(process.execPath, [fixture.scriptPath, "--skip-cachebuster"], {
    cwd: fixture.root,
    encoding: "utf8",
    env: fakeCodexEnvironment(fakeCodex, path.join(fixture.root, "codex-plugin")),
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(await fsp.readFile(fixture.manifestPath, "utf8"), fixture.manifestText);
  assert.deepEqual(
    (await fsp.readFile(fakeCodex.logPath, "utf8")).trim().split("\n"),
    ["plugin marketplace list --json", "plugin add workbench@local-work"],
  );
});

test("a successful deployment persists a fresh cachebuster before install", async (t) => {
  const fixture = await createFixture(t);
  const fakeCodex = await createFakeCodex(fixture.root);
  const result = spawnSync(process.execPath, [fixture.scriptPath], {
    cwd: fixture.root,
    encoding: "utf8",
    env: fakeCodexEnvironment(fakeCodex, path.join(fixture.root, "codex-plugin")),
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const manifest = JSON.parse(await fsp.readFile(fixture.manifestPath, "utf8"));
  assert.match(manifest.version, /^0\.1\.0\+codex\.\d{14}$/);
  assert.notEqual(manifest.version, "0.1.0+codex.previous");
  assert.deepEqual(
    (await fsp.readFile(fakeCodex.logPath, "utf8")).trim().split("\n"),
    ["plugin marketplace list --json", "plugin add workbench@local-work"],
  );
});

test("dry-run reports cachebuster and install actions without changing the manifest", async (t) => {
  const fixture = await createFixture(t);
  const fakeCodex = await createFakeCodex(fixture.root);
  const result = spawnSync(process.execPath, [fixture.scriptPath, "--dry-run"], {
    cwd: fixture.root,
    encoding: "utf8",
    env: fakeCodexEnvironment(fakeCodex, path.join(fixture.root, "codex-plugin")),
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[dry-run] 0\.1\.0\+codex\.previous -> 0\.1\.0\+codex\.\d{14}/);
  assert.match(result.stdout, /\[dry-run] codex plugin add workbench@local-work/);
  assert.equal(await fsp.readFile(fixture.manifestPath, "utf8"), fixture.manifestText);
  assert.equal(fs.existsSync(fakeCodex.logPath), false);
});

test("unknown options are rejected before Codex or the manifest is touched", async (t) => {
  const fixture = await createFixture(t);
  const fakeCodex = await createFakeCodex(fixture.root);
  const result = spawnSync(process.execPath, [fixture.scriptPath, "--unknown-option"], {
    cwd: fixture.root,
    encoding: "utf8",
    env: fakeCodexEnvironment(fakeCodex, path.join(fixture.root, "codex-plugin")),
  });

  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.match(result.stderr, /unknown option\(s\): --unknown-option/i);
  assert.equal(await fsp.readFile(fixture.manifestPath, "utf8"), fixture.manifestText);
  assert.equal(fs.existsSync(fakeCodex.logPath), false);
});
