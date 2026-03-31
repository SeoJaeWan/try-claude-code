/**
 * manifest-runtime.test.mjs
 *
 * Phase 1 rebaseline: validates the new manifest-owned runtime path.
 *
 * These tests exercise dispatchManifestCli and the supporting modules
 * (manifest-types, manifest-loader, help-builder) without any profile loader,
 * remote fetch, mode config, or cache dependency.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";

import { assertManifest } from "../src/core/runtime/manifest-types.mjs";
import { loadManifestDirect } from "../src/core/runtime/manifest-loader.mjs";
import { buildSummaryHelp, buildDetailHelp, buildHelpPayload } from "../src/core/runtime/help-builder.mjs";
import { dispatchManifestCli } from "../src/core/runtime/command-dispatcher.mjs";

// ---------------------------------------------------------------------------
// Fixture manifest — minimal, profile-free
// ---------------------------------------------------------------------------

const SNIPPET_TEMPLATE = `export function {{ name }}() {\n  // TODO\n}\n`;

function makeMinimalManifest() {
  return {
    id: "test/manifest/v1",
    alias: "test",
    helpSummary: {
      summary: "Test manifest summary.",
      flows: {
        "create-widget": {
          title: "Create a widget",
          summary: "Create the widget file.",
          steps: [
            { command: "widget", purpose: "Generate the widget file" }
          ]
        }
      }
    },
    commands: {
      widget: {
        description: "Generate a widget component.",
        inputMode: "json",
        execution: { kind: "snippet", language: "typescript" },
        summary: {
          whenToUse: ["When you need a new widget"],
          relatedCommands: [{ id: "widget", reason: "self" }],
          flowRefs: ["create-widget"]
        },
        normalizationRules: [
          { kind: "case", field: "name", style: "pascal", reason: "widget name uses PascalCase" }
        ],
        render: {
          snippetTemplateContent: SNIPPET_TEMPLATE
        }
      }
    }
  };
}

// ---------------------------------------------------------------------------
// manifest-types
// ---------------------------------------------------------------------------

test("assertManifest는 유효한 manifest를 그대로 반환한다", () => {
  const m = makeMinimalManifest();
  const result = assertManifest(m);
  assert.equal(result.alias, "test");
});

test("assertManifest는 alias가 없으면 INVALID_MANIFEST 오류를 던진다", () => {
  assert.throws(
    () => assertManifest({ commands: {} }),
    (error) => error.code === "INVALID_MANIFEST"
  );
});

test("assertManifest는 commands가 없으면 INVALID_MANIFEST 오류를 던진다", () => {
  assert.throws(
    () => assertManifest({ alias: "test" }),
    (error) => error.code === "INVALID_MANIFEST"
  );
});

test("assertManifest는 배열을 거부한다", () => {
  assert.throws(
    () => assertManifest([]),
    (error) => error.code === "INVALID_MANIFEST"
  );
});

// ---------------------------------------------------------------------------
// manifest-loader
// ---------------------------------------------------------------------------

test("loadManifestDirect는 유효한 manifest를 반환한다", () => {
  const m = makeMinimalManifest();
  const result = loadManifestDirect(m);
  assert.equal(result.id, "test/manifest/v1");
});

test("loadManifestDirect는 잘못된 manifest에서 INVALID_MANIFEST 오류를 던진다", () => {
  assert.throws(
    () => loadManifestDirect(null),
    (error) => error.code === "INVALID_MANIFEST"
  );
});

// ---------------------------------------------------------------------------
// help-builder
// ---------------------------------------------------------------------------

test("buildSummaryHelp는 manifest에서 summary payload를 만든다", () => {
  const m = makeMinimalManifest();
  const payload = buildSummaryHelp(m);

  assert.equal(payload.ok, true);
  assert.equal(payload.helpMode, "summary");
  assert.equal(payload.alias, "test");
  assert.equal(payload.id, "test/manifest/v1");
  assert.ok(payload.commands.widget, "widget 명령이 있어야 한다");
  assert.equal(payload.commands.widget.cliCommand, "widget");
  assert.match(payload.commands.widget.whenToUse[0], /When you need a new widget/);
  assert.deepEqual(payload.commands.widget.flowRefs, ["create-widget"]);
  assert.equal(payload.flows["create-widget"].steps[0].command, "widget");
});

test("buildDetailHelp는 특정 command의 detail payload를 만든다", () => {
  const m = makeMinimalManifest();
  const payload = buildDetailHelp(m, "widget");

  assert.equal(payload.ok, true);
  assert.equal(payload.helpMode, "detail");
  assert.deepEqual(Object.keys(payload.commands), ["widget"]);
});

test("buildDetailHelp는 commandName이 null이면 모든 명령을 반환한다", () => {
  const m = makeMinimalManifest();
  const payload = buildDetailHelp(m, null);

  assert.ok(Object.keys(payload.commands).length >= 1);
});

test("buildHelpPayload는 commandName 없으면 summary를 반환한다", () => {
  const m = makeMinimalManifest();
  const payload = buildHelpPayload(m, null);
  assert.equal(payload.helpMode, "summary");
});

test("buildHelpPayload는 commandName이 있으면 detail을 반환한다", () => {
  const m = makeMinimalManifest();
  const payload = buildHelpPayload(m, "widget");
  assert.equal(payload.helpMode, "detail");
});

test("buildSummaryHelp는 profile 시스템에 의존하지 않는다 (activeProfile 없음)", () => {
  // summary payload does not contain activeProfile field
  const m = makeMinimalManifest();
  const payload = buildSummaryHelp(m);
  assert.equal("activeProfile" in payload, false);
});

// ---------------------------------------------------------------------------
// dispatchManifestCli
// ---------------------------------------------------------------------------

function captureOutput() {
  const chunks = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk);
      callback();
    }
  });

  return {
    stream,
    get text() {
      return Buffer.concat(chunks).toString("utf8");
    },
    json() {
      return JSON.parse(this.text);
    }
  };
}

test("dispatchManifestCli --help는 summary JSON을 반환한다", async () => {
  const manifest = makeMinimalManifest();
  const out = captureOutput();
  const err = captureOutput();

  const exitCode = await dispatchManifestCli({
    manifest,
    argv: ["--help"],
    stdout: out.stream,
    stderr: err.stream
  });

  assert.equal(exitCode, 0);
  const payload = out.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.helpMode, "summary");
  assert.equal(payload.alias, "test");
  assert.ok(payload.commands.widget);
});

test("dispatchManifestCli widget --help는 detail JSON을 반환한다", async () => {
  const manifest = makeMinimalManifest();
  const out = captureOutput();
  const err = captureOutput();

  const exitCode = await dispatchManifestCli({
    manifest,
    argv: ["widget", "--help"],
    stdout: out.stream,
    stderr: err.stream
  });

  assert.equal(exitCode, 0);
  const payload = out.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.helpMode, "detail");
  assert.ok(payload.commands.widget);
});

test("dispatchManifestCli widget --json은 snippet result를 반환한다", async () => {
  const manifest = makeMinimalManifest();
  const out = captureOutput();
  const err = captureOutput();

  const exitCode = await dispatchManifestCli({
    manifest,
    argv: ["widget", "--json", JSON.stringify({ name: "productCard" })],
    stdout: out.stream,
    stderr: err.stream
  });

  assert.equal(exitCode, 0);
  const payload = out.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.normalizedSpec.name, "ProductCard");
  assert.equal(payload.result.kind, "snippet");
  assert.match(payload.result.code, /ProductCard/);
});

test("dispatchManifestCli 알 수 없는 명령은 UNKNOWN_COMMAND 오류를 반환한다", async () => {
  const manifest = makeMinimalManifest();
  const out = captureOutput();
  const err = captureOutput();

  const exitCode = await dispatchManifestCli({
    manifest,
    argv: ["nonexistent", "--json", "{}"],
    stdout: out.stream,
    stderr: err.stream
  });

  assert.equal(exitCode, 1);
  const payload = err.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "UNKNOWN_COMMAND");
});

test("dispatchManifestCli mode 명령은 UNKNOWN_COMMAND 오류를 반환한다 (mode 제거됨)", async () => {
  const manifest = makeMinimalManifest();
  const out = captureOutput();
  const err = captureOutput();

  const exitCode = await dispatchManifestCli({
    manifest,
    argv: ["mode", "show"],
    stdout: out.stream,
    stderr: err.stream
  });

  assert.equal(exitCode, 1);
  const payload = err.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "UNKNOWN_COMMAND");
});

test("dispatchManifestCli 잘못된 manifest는 INVALID_MANIFEST 오류를 반환한다", async () => {
  const out = captureOutput();
  const err = captureOutput();

  const exitCode = await dispatchManifestCli({
    manifest: { notAManifest: true },
    argv: ["--help"],
    stdout: out.stream,
    stderr: err.stream
  });

  assert.equal(exitCode, 1);
  const payload = err.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "INVALID_MANIFEST");
});

test("dispatchManifestCli --help는 profile/activeProfile 없이도 성공한다", async () => {
  // Explicitly verify no profile-related fields leak into the new path
  const manifest = makeMinimalManifest();
  const out = captureOutput();
  const err = captureOutput();

  await dispatchManifestCli({
    manifest,
    argv: ["--help"],
    stdout: out.stream,
    stderr: err.stream
  });

  const payload = out.json();
  assert.equal("activeProfile" in payload, false, "activeProfile은 새 runtime에 없어야 한다");
  assert.equal("extends" in payload, false, "extends는 새 runtime summary에 없어야 한다");
});
