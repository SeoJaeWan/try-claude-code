import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const captureScript = path.resolve(testDirectory, "..", "capture-script-source.mjs");
const temporaryRoots = [];

function temporaryRoot(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

test.after(() => {
  for (const root of temporaryRoots) fs.rmSync(root, { recursive: true, force: true });
});

function fixture(options = {}) {
  const root = temporaryRoot("llm-script-capture-");
  const workspace = path.join(root, "workspace");
  const collection = path.join(root, "collection");
  fs.mkdirSync(path.join(workspace, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(collection, "source"), { recursive: true });
  fs.writeFileSync(path.join(collection, "config.json"), `${JSON.stringify({
    schemaVersion: 1,
    enabled: options.enabled ?? true,
    maxSourceBytes: options.maxSourceBytes ?? 131072
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(collection, "workspaces.json"), `${JSON.stringify({
    workspaces: {
      [fs.realpathSync(workspace)]: {
        project: "fixture-project",
        capture: options.capture ?? true
      }
    }
  }, null, 2)}\n`);
  return { root, workspace, collection };
}

function runHook({ collection, workspace }, command, payloadOverrides = {}) {
  const payload = {
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
    cwd: workspace,
    tool_input: { command },
    tool_response: {
      stdout: "must never be persisted",
      access_token: "response-secret"
    },
    ...payloadOverrides
  };
  const result = spawnSync(process.execPath, ["--no-global-search-paths", captureScript], {
    input: JSON.stringify(payload),
    env: { ...process.env, LLM_SCRIPT_ROOT: collection },
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
  return result;
}

function runRaw(collection, input) {
  const result = spawnSync(process.execPath, ["--no-global-search-paths", captureScript], {
    input,
    env: { ...process.env, LLM_SCRIPT_ROOT: collection },
    encoding: "utf8"
  });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
}

function runHookAsync({ collection, workspace }, command) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--no-global-search-paths", captureScript], {
      env: { ...process.env, LLM_SCRIPT_ROOT: collection },
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (status) => {
      try {
        assert.equal(status, 0);
        assert.equal(stdout, "");
        assert.equal(stderr, "");
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    child.stdin.end(JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      cwd: workspace,
      tool_input: { command }
    }));
  });
}

function recordFiles(collection) {
  const recordsRoot = path.join(collection, "source", "records");
  if (!fs.existsSync(recordsRoot)) return [];
  const found = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (entry.name.endsWith(".json")) found.push(entryPath);
    }
  };
  visit(recordsRoot);
  return found.sort();
}

function records(collection) {
  return recordFiles(collection).map((filePath) => JSON.parse(fs.readFileSync(filePath, "utf8")));
}

test("missing, malformed, disabled, and unmapped setup are silent no-ops", () => {
  const missing = temporaryRoot("llm-script-capture-missing-");
  runRaw(missing, "not json");
  runRaw(missing, JSON.stringify({
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
    cwd: missing,
    tool_input: { command: "node absent.mjs" }
  }));
  assert.deepEqual(recordFiles(missing), []);

  const disabled = fixture({ enabled: false });
  runHook(disabled, "node scripts/absent.mjs");
  assert.deepEqual(recordFiles(disabled.collection), []);

  const unmapped = fixture({ capture: false });
  runHook(unmapped, "node scripts/absent.mjs");
  assert.deepEqual(recordFiles(unmapped.collection), []);
  assert.equal(fs.existsSync(path.join(unmapped.collection, "source", "records")), false);
});

test("captures a file's source, redacts a literal secret, and keeps repeated uses", () => {
  const current = fixture();
  fs.writeFileSync(
    path.join(current.workspace, "scripts", "check.mjs"),
    'const access_token = "diagnostic-token";\nconsole.log("checked");\n'
  );

  runHook(current, "API_TOKEN=command-secret node scripts/check.mjs");
  runHook(current, "node scripts/check.mjs");
  const captured = records(current.collection);
  assert.equal(captured.length, 2);
  assert.notEqual(recordFiles(current.collection)[0], recordFiles(current.collection)[1]);
  assert.deepEqual(captured[0], {
    schemaVersion: 1,
    capturedAt: captured[0].capturedAt,
    workspace: "fixture-project",
    cwd: ".",
    command: "node scripts/check.mjs",
    runtime: "node",
    source: {
      kind: "file",
      path: "scripts/check.mjs",
      language: "javascript",
      redacted: true,
      code: 'const access_token = "<redacted>";\nconsole.log("checked");\n'
    }
  });
  const serialized = JSON.stringify(captured);
  assert.doesNotMatch(serialized, /command-secret|diagnostic-token|response-secret|must never be persisted/u);
});

test("captures static inline and quoted heredoc source", () => {
  const current = fixture();
  runHook(current, `python3 -c 'print("inline")'`);
  runHook(current, "node <<'NODE'\nconsole.log('heredoc');\nNODE");
  runHook(current, String.raw`node -e "console.log('\n')"`);

  const captured = records(current.collection);
  assert.equal(captured.length, 3);
  const inline = captured.find((record) => record.runtime === "python");
  const doubleQuotedInline = captured.find(
    (record) => record.runtime === "node" && record.source.kind === "inline"
  );
  const heredoc = captured.find((record) => record.source.kind === "heredoc");
  assert.equal(inline.command, "python3 -c <inline>");
  assert.equal(inline.source.code, 'print("inline")');
  assert.equal(doubleQuotedInline.source.code, String.raw`console.log('\n')`);
  assert.equal(heredoc.command, "node <heredoc>");
  assert.equal(heredoc.source.code, "console.log('heredoc');\n");
});

test("prefers an explicit hook workdir when the payload provides one", () => {
  const current = fixture();
  fs.writeFileSync(path.join(current.workspace, "scripts", "check.mjs"), "console.log('workdir');\n");
  runHook(current, "ignored", {
    cwd: current.root,
    tool_input: {
      command: "node scripts/check.mjs",
      workdir: current.workspace
    }
  });

  const captured = records(current.collection);
  assert.equal(captured.length, 1);
  assert.equal(captured[0].source.path, "scripts/check.mjs");
});

test("tracks an unambiguous static cd and writes one record per entrypoint", () => {
  const current = fixture();
  const tools = path.join(current.workspace, "tools");
  fs.mkdirSync(tools);
  fs.writeFileSync(path.join(tools, "first.mjs"), "console.log('first');\n");
  fs.writeFileSync(path.join(tools, "second.py"), "print('second')\n");

  runHook(current, "cd tools && node first.mjs; python3 second.py");
  const captured = records(current.collection);
  assert.equal(captured.length, 2);
  assert.deepEqual(captured.map((record) => record.source.path).sort(), [
    "tools/first.mjs",
    "tools/second.py"
  ]);
  assert.equal(captured.every((record) => record.cwd === "tools"), true);
  assert.deepEqual(captured.map((record) => record.command).sort(), [
    "node first.mjs",
    "python3 second.py"
  ]);
});

test("keeps command paths relative to each entrypoint execution cwd", () => {
  const current = fixture();
  const tools = path.join(current.workspace, "tools");
  fs.mkdirSync(tools);
  fs.writeFileSync(path.join(tools, "check.mjs"), "console.log('nested');\n");
  runHook(current, "node check.mjs", { cwd: tools });

  const [captured] = records(current.collection);
  assert.equal(captured.cwd, "tools");
  assert.equal(captured.command, "node check.mjs");
  assert.equal(captured.source.path, "tools/check.mjs");
});

test("does not guess conditional branches but permits a verified static cd with and", () => {
  const current = fixture();
  fs.writeFileSync(path.join(current.workspace, "scripts", "first.mjs"), "console.log('first');\n");
  fs.writeFileSync(path.join(current.workspace, "scripts", "second.mjs"), "console.log('second');\n");
  fs.writeFileSync(path.join(current.workspace, "scripts", "fallback.mjs"), "console.log('fallback');\n");

  runHook(current, "node scripts/first.mjs && node scripts/second.mjs");
  runHook(current, "cd scripts || node fallback.mjs");
  runHook(current, "cd scripts && node second.mjs");
  const captured = records(current.collection);
  assert.deepEqual(captured.map((record) => record.source.path).sort(), [
    "scripts/first.mjs",
    "scripts/second.mjs"
  ]);
});

test("skips dynamic, module, outside, sensitive, binary, and oversized file candidates", () => {
  const current = fixture({ maxSourceBytes: 64 });
  const outside = path.join(current.root, "outside.mjs");
  fs.writeFileSync(outside, "console.log('outside');\n");
  fs.symlinkSync(outside, path.join(current.workspace, "scripts", "escape.mjs"));
  fs.writeFileSync(path.join(current.workspace, "scripts", "binary.mjs"), Buffer.from([0, 1, 2]));
  fs.writeFileSync(path.join(current.workspace, "scripts", "invalid.mjs"), Buffer.from([0xc3, 0x28]));
  fs.writeFileSync(path.join(current.workspace, "scripts", "large.mjs"), "x".repeat(65));
  fs.writeFileSync(path.join(current.workspace, "scripts", ".env.py"), "print('secret')\n");

  runHook(
    current,
    `echo "node scripts/escape.mjs"; node $SCRIPT; python3 -m module; node ${outside}; node scripts/escape.mjs; node scripts/binary.mjs; node scripts/invalid.mjs; node scripts/large.mjs; python3 scripts/.env.py`
  );
  runHook(current, "git status && rg token .");
  assert.deepEqual(recordFiles(current.collection), []);
});

test("skips private keys but captures and redacts a safe inline secret", () => {
  const current = fixture();
  runHook(current, `node -e 'const api_token = "super-secret-value"; console.log(api_token)'`);
  runHook(current, "node <<'NODE'\nconst key = `-----BEGIN PRIVATE KEY-----`;\nNODE");

  const captured = records(current.collection);
  assert.equal(captured.length, 1);
  assert.equal(captured[0].source.redacted, true);
  assert.match(captured[0].source.code, /<redacted>/u);
  assert.doesNotMatch(JSON.stringify(captured), /super-secret-value|BEGIN PRIVATE KEY/u);
});

test("redacts template literals and unquoted shell secret assignments", () => {
  const current = fixture();
  runHook(current, "node -e 'const access_token = `template-secret-value`'");
  runHook(current, "access_token=unquoted-secret-value\nfor item in one; do\n  echo ok\ndone");

  const captured = records(current.collection);
  assert.equal(captured.length, 2);
  assert.equal(captured.every((record) => record.source.redacted), true);
  const serialized = JSON.stringify(captured);
  assert.doesNotMatch(serialized, /template-secret-value|unquoted-secret-value/u);
  assert.match(serialized, /<redacted>/u);
});

test("redacts home paths, credential URLs, and secret-bearing flags from source", () => {
  const current = fixture();
  const code = [
    `const home = "${os.homedir()}/private";`,
    'const dsn = "postgres://user:database-password@example.test/db";',
    'const command = "tool --password flag-secret";'
  ].join("\n");
  fs.writeFileSync(path.join(current.workspace, "scripts", "secrets.mjs"), `${code}\n`);
  runHook(current, "node scripts/secrets.mjs");

  const [captured] = records(current.collection);
  assert.equal(captured.source.redacted, true);
  const serialized = JSON.stringify(captured);
  assert.doesNotMatch(serialized, new RegExp(os.homedir().replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  assert.doesNotMatch(serialized, /database-password|flag-secret/u);
  assert.match(serialized, /<home>|<redacted>/u);
});

test("recognizes Node's test-mode file entrypoint", () => {
  const current = fixture();
  fs.writeFileSync(path.join(current.workspace, "scripts", "check.test.mjs"), "console.log('test');\n");
  runHook(
    current,
    "node --test scripts/check.test.mjs --test-name-pattern safe --client-secret command-secret --refresh-token=refresh-secret --header \"X-Api-Key: header-secret\""
  );
  const [captured] = records(current.collection);
  assert.equal(captured.source.path, "scripts/check.test.mjs");
  assert.equal(
    captured.command,
    "node --test scripts/check.test.mjs --test-name-pattern safe --client-secret \"<redacted>\" \"--refresh-token=<redacted>\" --header \"X-Api-Key: <redacted>\""
  );
  assert.doesNotMatch(JSON.stringify(captured), /command-secret|refresh-secret|header-secret/u);
});

test("applies the source-size limit to inline, heredoc, and shell source", () => {
  const current = fixture({ maxSourceBytes: 32 });
  runHook(current, `node -e '${"x".repeat(33)}'`);
  runHook(current, `python3 <<'PY'\n${"x".repeat(33)}\nPY`);
  runHook(current, `for item in one two three; do\n  echo "${"x".repeat(33)}"\ndone`);
  assert.deepEqual(recordFiles(current.collection), []);
});

test("captures only clear shell programs and supports the cmd payload fallback", () => {
  const current = fixture();
  runHook(current, "ignored", {
    tool_input: {
      cmd: "for file in *.mjs; do\n  echo \"$file\"\ndone"
    }
  });
  const captured = records(current.collection);
  assert.equal(captured.length, 1);
  assert.equal(captured[0].runtime, "shell");
  assert.equal(captured[0].source.kind, "shell");
  assert.match(captured[0].source.code, /^for file/u);
});

test("refuses a records symlink and never leaves temporary files", () => {
  const current = fixture();
  const redirected = path.join(current.root, "redirected");
  fs.mkdirSync(redirected);
  fs.symlinkSync(redirected, path.join(current.collection, "source", "records"));
  fs.writeFileSync(path.join(current.workspace, "scripts", "check.mjs"), "console.log('safe');\n");

  runHook(current, "node scripts/check.mjs");
  assert.deepEqual(fs.readdirSync(redirected), []);
});

test("concurrent captures create complete unique records without temporary leftovers", async () => {
  const current = fixture();
  fs.writeFileSync(path.join(current.workspace, "scripts", "check.mjs"), "console.log('safe');\n");

  await Promise.all(Array.from({ length: 8 }, () => runHookAsync(current, "node scripts/check.mjs")));
  const files = recordFiles(current.collection);
  assert.equal(files.length, 8);
  assert.equal(new Set(files.map((filePath) => path.basename(filePath))).size, 8);
  for (const filePath of files) {
    assert.equal(JSON.parse(fs.readFileSync(filePath, "utf8")).source.code, "console.log('safe');\n");
  }
  const dayDirectory = path.dirname(files[0]);
  assert.equal(fs.readdirSync(dayDirectory).some((name) => name.endsWith(".tmp")), false);
});
