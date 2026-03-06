#!/usr/bin/env node
/**
 * Coding Conventions Generator - CLI Entry Point
 * Generates code boilerplate following project coding conventions.
 */

import path from "path";
import process from "process";
import {
  generateApiHook,
  generateComponent,
  generateHook,
  generateStructure,
  generateTestSuite,
} from "./generators/index.mjs";

function usage() {
  return `Coding Conventions Generator

Usage:
  node generate.mjs component <Name> [--type page|layout|ui] [--output <path>] [--props "..."] [--no-jsdoc] [--no-test]
  node generate.mjs hook <Name> [--type form|api|util|page] [--output <path>] [--state "..."] [--no-jsdoc] [--no-test]
  node generate.mjs structure <path> [--type page|api|module] [--framework nextjs|nestjs] [--no-gitkeep] [--create] [--output <path>]
  node generate.mjs api-hook <Name> [--method query|mutation] [--endpoint "/api/path"] [--output <path>] [--no-jsdoc] [--no-test]
  node generate.mjs test-suite <Name> [--type hook|component|function] [--path <target-path>] [--no-arrange]
`;
}

function parseArgs(argv) {
  const options = {};
  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      i += 1;
    } else {
      options[key] = true;
    }
  }
  return { positionals, options };
}

function formatComponentOutput(result, outputPath = null) {
  const basePath = outputPath ? outputPath : process.cwd();
  const folderName = result.folder;
  const lines = [];
  lines.push("=".repeat(60));
  lines.push("✅ Component Generated");
  lines.push("=".repeat(60));
  lines.push(`📁 Output: ${path.join(basePath, folderName)}`);
  lines.push("");
  lines.push(`📄 ${result.component_file}:`);
  lines.push("-".repeat(60));
  lines.push(result.component);
  if (result.test) {
    lines.push("");
    lines.push(`📄 ${result.test_file}:`);
    lines.push("-".repeat(60));
    lines.push(result.test);
  }
  lines.push("=".repeat(60));
  lines.push("\n💡 Next steps:");
  lines.push(`   1. Create folder: mkdir -p ${path.join(basePath, folderName)}`);
  lines.push(`   2. Copy component code to ${result.component_file}`);
  lines.push(`   3. Copy test code to ${result.test_file}`);
  lines.push("=".repeat(60));
  return lines.join("\n");
}

function formatHookOutput(result, outputPath = null) {
  const basePath = outputPath ? outputPath : result.base_path || "hooks/utils";
  const folderName = result.folder;
  const lines = [];
  lines.push("=".repeat(60));
  lines.push("✅ Hook Generated");
  lines.push("=".repeat(60));
  lines.push(`📁 Output: ${path.join(basePath, folderName)}`);
  lines.push("");
  lines.push(`📄 ${result.hook_file}:`);
  lines.push("-".repeat(60));
  lines.push(result.hook);
  if (result.test) {
    lines.push("");
    lines.push(`📄 ${result.test_file}:`);
    lines.push("-".repeat(60));
    lines.push(result.test);
  }
  lines.push("=".repeat(60));
  lines.push("\n💡 Next steps:");
  lines.push(`   1. Create folder: mkdir -p ${path.join(basePath, folderName)}`);
  lines.push(`   2. Copy hook code to ${result.hook_file}`);
  lines.push(`   3. Copy test code to ${result.test_file}`);
  lines.push("=".repeat(60));
  return lines.join("\n");
}

function formatStructureOutput(result) {
  const lines = [];
  lines.push("=".repeat(60));
  lines.push(`✅ Folder Structure Generated (${result.framework || "unknown"} - ${result.type || "unknown"})`);
  lines.push("=".repeat(60));
  if (result.error) {
    lines.push(`❌ Error: ${result.error}`);
    lines.push("\nFallback: See .claude/try-claude/references/coding-rules/folder-structure.md");
    return lines.join("\n");
  }
  lines.push("\n📁 Folders:");
  for (const folder of result.folders || []) {
    lines.push(`   ${folder}`);
  }
  lines.push("\n📄 Files:");
  for (const [filePath] of result.files || []) {
    lines.push(`   ${filePath}`);
  }
  if (result.created) {
    lines.push("\n✅ Created:");
    for (const item of result.created) {
      lines.push(`   ${item}`);
    }
  }
  lines.push("=".repeat(60));
  return lines.join("\n");
}

function formatApiHookOutput(result, outputPath = null) {
  const basePath = outputPath ? outputPath : result.base_path || `hooks/apis/${result.subfolder}`;
  const folderName = result.folder;
  const lines = [];
  lines.push("=".repeat(60));
  lines.push(`✅ API Hook Generated (${result.subfolder})`);
  lines.push("=".repeat(60));
  lines.push(`📁 Output: ${path.join(basePath, folderName)}`);
  lines.push("");
  lines.push(`📄 ${result.hook_file}:`);
  lines.push("-".repeat(60));
  lines.push(result.hook);
  if (result.test) {
    lines.push("");
    lines.push(`📄 ${result.test_file}:`);
    lines.push("-".repeat(60));
    lines.push(result.test);
  }
  lines.push("=".repeat(60));
  lines.push("\n💡 Next steps:");
  lines.push(`   1. Create folder: mkdir -p ${path.join(basePath, folderName)}`);
  lines.push(`   2. Copy hook code to ${result.hook_file}`);
  lines.push(`   3. Copy test code to ${result.test_file}`);
  lines.push("=".repeat(60));
  return lines.join("\n");
}

function formatTestSuiteOutput(result, targetName) {
  const lines = [];
  lines.push("=".repeat(60));
  lines.push(`✅ Test Suite Generated (${result.type})`);
  lines.push("=".repeat(60));
  lines.push(`📄 Target: ${targetName}`);
  lines.push("");
  lines.push(`📄 ${result.file}:`);
  lines.push("-".repeat(60));
  lines.push(result.test);
  lines.push("=".repeat(60));
  lines.push("\n💡 Next steps:");
  lines.push(`   1. Copy test code to ${targetName}/${result.file}`);
  lines.push("   2. Add specific test cases");
  lines.push("=".repeat(60));
  return lines.join("\n");
}

function run() {
  const { positionals, options } = parseArgs(process.argv.slice(2));
  if (positionals.length === 0 || options.help || options.h) {
    console.log(usage());
    process.exit(0);
  }

  const generator = positionals[0];

  try {
    if (generator === "component") {
      const name = positionals[1];
      if (!name) {
        throw new Error("component requires <Name>");
      }
      const result = generateComponent(name, options.type || "ui", options.props, !options["no-jsdoc"], !options["no-test"]);
      console.log(formatComponentOutput(result, options.output));
      return;
    }

    if (generator === "hook") {
      const name = positionals[1];
      if (!name) {
        throw new Error("hook requires <Name>");
      }
      const result = generateHook(name, options.type || "util", options.state, !options["no-jsdoc"], !options["no-test"]);
      console.log(formatHookOutput(result, options.output));
      return;
    }

    if (generator === "structure") {
      const structurePath = positionals[1];
      if (!structurePath) {
        throw new Error("structure requires <path>");
      }
      const result = generateStructure(
        structurePath,
        options.type || "page",
        options.framework || null,
        !options["no-gitkeep"],
        Boolean(options.create),
        options.output || null
      );
      console.log(formatStructureOutput(result));
      return;
    }

    if (generator === "api-hook") {
      const name = positionals[1];
      if (!name) {
        throw new Error("api-hook requires <Name>");
      }
      const result = generateApiHook(
        name,
        options.method || "query",
        options.endpoint || null,
        !options["no-jsdoc"],
        !options["no-test"]
      );
      console.log(formatApiHookOutput(result, options.output));
      return;
    }

    if (generator === "test-suite") {
      const name = positionals[1];
      if (!name) {
        throw new Error("test-suite requires <Name>");
      }
      const result = generateTestSuite(name, options.type || "function", options.path || null, !options["no-arrange"]);
      console.log(formatTestSuiteOutput(result, name));
      return;
    }

    throw new Error(`Unknown generator: ${generator}`);
  } catch (err) {
    console.error(`❌ Error: ${String(err.message || err)}`);
    console.error("\nFallback: Please refer to .claude/try-claude/references/coding-rules/");
    console.error("- code-style.md: Component structure");
    console.error("- typescript.md: Props interface");
    console.error("- naming.md: Naming conventions");
    console.error("- folder-structure.md: Folder structure");
    process.exit(1);
  }
}

run();

