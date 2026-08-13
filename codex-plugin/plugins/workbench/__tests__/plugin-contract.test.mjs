import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseOpenaiMetadata } from "./test-helpers.mjs";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codexPluginRoot = path.resolve(pluginRoot, "..", "..");
const manifestPath = path.join(pluginRoot, ".codex-plugin", "plugin.json");
const mcpPath = path.join(pluginRoot, ".mcp.json");
const marketplacePath = path.join(codexPluginRoot, ".agents", "plugins", "marketplace.json");
const expectedSkills = new Set([
  "execute-task",
  "finalize",
  "memory-update",
  "prepare",
  "shape",
]);
const strictSemver =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertNonEmptyString(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  assert.notEqual(value.trim(), "", `${label} must not be empty`);
}

test("plugin manifest exposes only the active Workbench v2 contract", () => {
  const manifest = readJson(manifestPath);

  assert.deepEqual(Object.keys(manifest).sort(), [
    "author",
    "description",
    "interface",
    "mcpServers",
    "name",
    "skills",
    "version",
  ]);
  assert.deepEqual(Object.keys(manifest.author).sort(), ["name"]);
  assert.deepEqual(Object.keys(manifest.interface).sort(), [
    "brandColor",
    "capabilities",
    "category",
    "defaultPrompt",
    "developerName",
    "displayName",
    "longDescription",
    "shortDescription",
  ]);

  assert.equal(manifest.name, "workbench");
  assert.match(manifest.version, strictSemver);
  assertNonEmptyString(manifest.description, "description");
  assertNonEmptyString(manifest.author?.name, "author.name");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.equal(fs.existsSync(mcpPath), true, "manifest MCP companion must exist");
  assert.equal("hooks" in manifest, false, "legacy hooks must not be active");
  assert.equal("apps" in manifest, false, "apps must be omitted without an app manifest");

  for (const field of [
    "displayName",
    "shortDescription",
    "longDescription",
    "developerName",
    "category",
  ]) {
    assertNonEmptyString(manifest.interface?.[field], `interface.${field}`);
  }
  assert.ok(Array.isArray(manifest.interface?.capabilities), "capabilities must be an array");
  assert.ok(
    manifest.interface.capabilities.length > 0,
    "capabilities must describe the active Workbench v2 surface",
  );
  for (const capability of manifest.interface.capabilities) {
    assertNonEmptyString(capability, "interface.capabilities[]");
  }
  assert.match(manifest.interface.brandColor, /^#[0-9A-Fa-f]{6}$/);

  const prompts = manifest.interface?.defaultPrompt;
  assert.ok(Array.isArray(prompts), "interface.defaultPrompt must be an array");
  assert.ok(prompts.length >= 1 && prompts.length <= 3, "defaultPrompt must contain 1-3 entries");
  for (const [index, prompt] of prompts.entries()) {
    assertNonEmptyString(prompt, `interface.defaultPrompt[${index}]`);
    assert.ok(prompt.length <= 128, `interface.defaultPrompt[${index}] must be at most 128 chars`);
    const selectors = [...prompt.matchAll(/\$workbench:([a-z0-9-]+)/g)].map(
      (match) => match[1],
    );
    assert.ok(selectors.length > 0, `interface.defaultPrompt[${index}] must name a skill`);
    for (const selector of selectors) {
      assert.ok(expectedSkills.has(selector), `default prompt advertises stale skill ${selector}`);
    }
  }

  assert.doesNotMatch(
    JSON.stringify(manifest),
    /\$workbench:(?:brainstorm|dev-wiki|executor|issue-brief|llm-script|openapi|visual-grounding)\b/,
    "manifest must not advertise legacy selectors",
  );
  assert.doesNotMatch(
    `${manifest.description} ${manifest.interface.longDescription} ${manifest.interface.capabilities.join(" ")}`,
    /session-start|script.source|openapi registry|swagger registry/i,
    "manifest must not describe removed legacy runtime features",
  );
});

test("default plugin discovery cannot revive legacy hooks, tools, or apps", () => {
  const forbiddenRuntimePaths = [
    path.join(pluginRoot, "hooks"),
    path.join(pluginRoot, "hooks", "hooks.json"),
    path.join(pluginRoot, "tools"),
    path.join(pluginRoot, ".app.json"),
  ];

  for (const forbiddenPath of forbiddenRuntimePaths) {
    assert.equal(
      fs.existsSync(forbiddenPath),
      false,
      `${path.relative(pluginRoot, forbiddenPath)} must remain absent from active discovery`,
    );
  }
});

test("MCP companion registers the four evidence services without embedded credentials", () => {
  const mcp = readJson(mcpPath);

  assert.deepEqual(mcp, {
    mcpServers: {
      "local-work-memory": {
        type: "http",
        url: "https://mcp.seojaewan.com/mcp/memory",
      },
      context7: {
        type: "http",
        url: "https://mcp.context7.com/mcp",
      },
      atlassian: {
        type: "http",
        url: "https://mcp.atlassian.com/v1/mcp/authv2",
      },
      figma: {
        type: "http",
        url: "https://mcp.figma.com/mcp",
        oauth_resource: "https://mcp.figma.com/mcp",
      },
    },
  });
  assert.doesNotMatch(
    JSON.stringify(mcp),
    /authorization|api[_-]?key|token|secret|headers/i,
    "MCP config must rely on remote authentication rather than embedded credentials",
  );
});

test("skill metadata declares exact typed MCP dependencies", () => {
  function metadata(skill) {
    const file = path.join(pluginRoot, "skills", skill, "agents", "openai.yaml");
    return parseOpenaiMetadata(fs.readFileSync(file, "utf8"), `${skill}/agents/openai.yaml`);
  }

  const memory = {
    type: "mcp",
    value: "local-work-memory",
    description: "Read project conventions, documents, Work Items, and Workbench artifacts",
    transport: "streamable_http",
    url: "https://mcp.seojaewan.com/mcp/memory",
  };
  const context7 = {
    type: "mcp",
    value: "context7",
    description: "Retrieve current version-aware technical documentation",
    transport: "streamable_http",
    url: "https://mcp.context7.com/mcp",
  };
  const atlassian = {
    type: "mcp",
    value: "atlassian",
    description: "Read linked Jira issues and comments as project evidence",
    transport: "streamable_http",
    url: "https://mcp.atlassian.com/v1/mcp/authv2",
  };
  const figma = {
    type: "mcp",
    value: "figma",
    description: "Inspect linked Figma designs as project evidence",
    transport: "streamable_http",
    url: "https://mcp.figma.com/mcp",
  };

  assert.deepEqual(metadata("shape").dependencies?.tools, [
    memory,
    context7,
    atlassian,
    figma,
  ]);
  assert.deepEqual(metadata("memory-update").dependencies?.tools, [
    {
      ...memory,
      description: "Commit a selected Shape or Prepare result as an immutable Workbench artifact",
    },
  ]);
  assert.deepEqual(metadata("execute-task").dependencies?.tools, [
    {
      ...memory,
      description: "Read project documents and resolve supplied Prepare artifact references",
    },
    {
      ...context7,
      description: "Verify version-aware library details discovered during implementation",
    },
  ]);
  assert.deepEqual(metadata("prepare").dependencies?.tools, [
    {
      ...memory,
      description: "Read project documents and resolve supplied Workbench artifact references",
    },
  ]);
  assert.deepEqual(metadata("finalize").dependencies?.tools, [
    {
      ...memory,
      description: "Resolve supplied workflow artifact references and read project documents",
    },
  ]);
});

test("repo-local marketplace installs Workbench with install-time authentication", () => {
  const marketplace = readJson(marketplacePath);

  assert.equal(marketplace.name, "local-work");
  assert.equal(marketplace.interface?.displayName, "Local Work Plugins");
  assert.deepEqual(marketplace.plugins, [
    {
      name: "workbench",
      source: {
        source: "local",
        path: "./plugins/workbench",
      },
      policy: {
        installation: "AVAILABLE",
        authentication: "ON_INSTALL",
      },
      category: "Productivity",
    },
  ]);
});
