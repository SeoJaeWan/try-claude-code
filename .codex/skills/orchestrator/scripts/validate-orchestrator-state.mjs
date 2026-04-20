#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ALLOWED_STAGES = new Set([
  "drafting",
  "waiting_architect_clarification",
  "reviewing",
  "waiting_user_gate",
  "ready_for_materialize",
  "blocked_external",
  "materialize_failed",
  "stuck",
  "done",
]);

function printUsage() {
  process.stdout.write(
    [
      "Usage:",
      "  node ./.codex/skills/orchestrator/scripts/validate-orchestrator-state.mjs --state <path>",
      "",
      "Validates orchestrator state.json syntax, required shape, and key stage invariants.",
    ].join("\n") + "\n"
  );
}

function parseArgs(argv) {
  const options = {
    state: null,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }

    if (token === "--json") {
      options.json = true;
      continue;
    }

    if (token === "--state") {
      options.state = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (token.startsWith("--state=")) {
      options.state = token.slice("--state=".length);
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return options;
}

function fail(code, payload) {
  if (payload.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write(`${payload.status}: ${payload.path}\n`);
    if (payload.message) {
      process.stdout.write(`${payload.message}\n`);
    }
    if (payload.line && payload.column) {
      process.stdout.write(`line ${payload.line}, column ${payload.column}\n`);
    }
    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      for (const error of payload.errors) {
        process.stdout.write(`- ${error}\n`);
      }
    }
  }
  process.exitCode = code;
}

function decodeJsonErrorPosition(rawText, error) {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/position\s+(\d+)/i);
  if (!match) {
    return { message };
  }

  const offset = Number.parseInt(match[1], 10);
  if (!Number.isFinite(offset) || offset < 0) {
    return { message };
  }

  const prefix = rawText.slice(0, offset);
  const lines = prefix.split("\n");
  return {
    message,
    line: lines.length,
    column: lines.at(-1).length + 1,
  };
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectType(errors, value, label, type, { nullable = false } = {}) {
  if (value === null && nullable) {
    return;
  }

  if (type === "array") {
    if (!Array.isArray(value)) {
      errors.push(`${label} must be an array`);
    }
    return;
  }

  if (type === "object") {
    if (!isObject(value)) {
      errors.push(`${label} must be an object`);
    }
    return;
  }

  if (typeof value !== type) {
    errors.push(`${label} must be a ${type}`);
  }
}

function validateAgent(errors, agent, label, expectedRole) {
  expectType(errors, agent, label, "object");
  if (!isObject(agent)) {
    return;
  }

  if (!(typeof agent.id === "string" || agent.id === null)) {
    errors.push(`${label}.id must be a string or null`);
  }

  if (agent.role !== expectedRole) {
    errors.push(`${label}.role must equal "${expectedRole}"`);
  }
}

function validateStateShape(state) {
  const errors = [];

  expectType(errors, state, "state", "object");
  if (!isObject(state)) {
    return errors;
  }

  expectType(errors, state.task_slug, "task_slug", "string");
  expectType(errors, state.plan_path, "plan_path", "string");
  expectType(errors, state.stage, "stage", "string");
  expectType(errors, state.review_loop_count, "review_loop_count", "number");
  expectType(errors, state.materialize_loop_count, "materialize_loop_count", "number");
  expectType(errors, state.last_review_outcome, "last_review_outcome", "string", { nullable: true });
  expectType(errors, state.last_review_signature, "last_review_signature", "string", { nullable: true });
  expectType(errors, state.last_materialize_outcome, "last_materialize_outcome", "string", { nullable: true });
  expectType(errors, state.last_materialize_gate_status, "last_materialize_gate_status", "string", { nullable: true });
  expectType(errors, state.last_materialize_signature, "last_materialize_signature", "string", { nullable: true });
  expectType(errors, state.user_gate_required, "user_gate_required", "boolean");
  expectType(errors, state.user_approved, "user_approved", "boolean");
  expectType(errors, state.blocked_by, "blocked_by", "string", { nullable: true });
  expectType(errors, state.blocker_type, "blocker_type", "string", { nullable: true });
  expectType(errors, state.resume_from, "resume_from", "string", { nullable: true });
  expectType(errors, state.stuck_reason, "stuck_reason", "string", { nullable: true });

  if (typeof state.stage === "string" && !ALLOWED_STAGES.has(state.stage)) {
    errors.push(`stage must be one of: ${Array.from(ALLOWED_STAGES).join(", ")}`);
  }

  expectType(errors, state.agents, "agents", "object");
  if (isObject(state.agents)) {
    validateAgent(errors, state.agents.plan_architect, "agents.plan_architect", "plan-architect");
    validateAgent(errors, state.agents.plan_reviewer, "agents.plan_reviewer", "plan-reviewer");
    validateAgent(errors, state.agents.plan_materializer, "agents.plan_materializer", "plan-materializer");
  }

  expectType(errors, state.clarification, "clarification", "object");
  if (isObject(state.clarification)) {
    if (!(typeof state.clarification.packet_path === "string" || state.clarification.packet_path === null)) {
      errors.push("clarification.packet_path must be a string or null");
    }
    if (!(typeof state.clarification.clarification_signature === "string" || state.clarification.clarification_signature === null)) {
      errors.push("clarification.clarification_signature must be a string or null");
    }
  }

  expectType(errors, state.user_gate, "user_gate", "object");
  if (isObject(state.user_gate)) {
    if (!(typeof state.user_gate.packet_path === "string" || state.user_gate.packet_path === null)) {
      errors.push("user_gate.packet_path must be a string or null");
    }
  }

  expectType(errors, state.preflight, "preflight", "object");
  if (isObject(state.preflight)) {
    if (state.preflight.mode !== "orchestrated") {
      errors.push('preflight.mode must equal "orchestrated"');
    }
    expectType(errors, state.preflight.complete, "preflight.complete", "boolean");
    if (!(typeof state.preflight.review_wiki_root === "string" || state.preflight.review_wiki_root === null)) {
      errors.push("preflight.review_wiki_root must be a string or null");
    }
    expectType(errors, state.preflight.named_agents_verified, "preflight.named_agents_verified", "boolean");
    expectType(errors, state.preflight.verified_agents, "preflight.verified_agents", "array");
  }

  if (state.stage === "waiting_user_gate" && state.user_approved === true) {
    errors.push("waiting_user_gate cannot be combined with user_approved = true");
  }

  if (state.stage === "ready_for_materialize" && state.user_approved !== true) {
    errors.push("ready_for_materialize requires user_approved = true");
  }

  if (state.stage === "blocked_external") {
    if (state.blocker_type !== "external_setup") {
      errors.push('blocked_external requires blocker_type = "external_setup"');
    }
    if (typeof state.resume_from !== "string" || state.resume_from.length === 0) {
      errors.push("blocked_external requires a non-empty resume_from");
    }
  }

  if (state.stage === "materialize_failed") {
    if (state.last_materialize_outcome !== "completed") {
      errors.push('materialize_failed requires last_materialize_outcome = "completed"');
    }
    if (state.last_materialize_gate_status !== "failed") {
      errors.push('materialize_failed requires last_materialize_gate_status = "failed"');
    }
  }

  if (state.stage === "done") {
    if (state.user_approved !== true) {
      errors.push("done requires user_approved = true");
    }
    if (state.last_materialize_outcome !== "completed") {
      errors.push('done requires last_materialize_outcome = "completed"');
    }
    if (state.last_materialize_gate_status !== "passed") {
      errors.push('done requires last_materialize_gate_status = "passed"');
    }
  }

  if (state.stage === "stuck" && (typeof state.stuck_reason !== "string" || state.stuck_reason.trim().length === 0)) {
    errors.push("stuck requires a non-empty stuck_reason");
  }

  if (state.blocker_type === "agent_stall" && state.stage !== "stuck") {
    errors.push('blocker_type = "agent_stall" requires stage = "stuck"');
  }

  return errors;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  if (!options.state) {
    throw new Error("Missing required --state <path> argument.");
  }

  const statePath = path.resolve(options.state);
  let rawText = fs.readFileSync(statePath, "utf8");
  if (rawText.charCodeAt(0) === 0xfeff) {
    rawText = rawText.slice(1);
  }

  let state;
  try {
    state = JSON.parse(rawText);
  } catch (error) {
    const details = decodeJsonErrorPosition(rawText, error);
    fail(1, {
      status: "INVALID_JSON",
      path: statePath,
      json: options.json,
      ...details,
    });
    return;
  }

  const errors = validateStateShape(state);
  if (errors.length > 0) {
    fail(2, {
      status: "INVALID_STATE",
      path: statePath,
      json: options.json,
      errors,
    });
    return;
  }

  const payload = {
    status: "VALID_STATE",
    path: statePath,
    stage: state.stage,
    task_slug: state.task_slug,
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write(`VALID_STATE: ${statePath}\n`);
    process.stdout.write(`task_slug=${state.task_slug}\n`);
    process.stdout.write(`stage=${state.stage}\n`);
  }
}

try {
  main();
} catch (error) {
  fail(3, {
    status: "VALIDATION_ERROR",
    path: process.cwd(),
    json: process.argv.includes("--json"),
    message: error instanceof Error ? error.message : String(error),
  });
}
