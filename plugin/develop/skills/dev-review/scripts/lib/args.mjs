import process from "node:process";

const FLAGS = {
  string: new Set([
    "--task-slug",
    "--plan-path",
    "--worktree",
    "--base",
    "--task-branch",
    "--out",
    "--diffs-dir",
    "--prior-feedback",
    "--prior-history",
    "--log-level",
    "--now",
  ]),
  integer: new Set(["--iteration"]),
  repeatable: new Set(["--available-agents-dir"]),
};

const REQUIRED = [
  "--task-slug",
  "--plan-path",
  "--worktree",
  "--base",
  "--task-branch",
  "--iteration",
  "--out",
];

export function parseArgs(argv) {
  const raw = argv.slice(2);
  const out = { availableAgentsDirs: [] };

  for (let i = 0; i < raw.length; i += 1) {
    const flag = raw[i];
    if (!flag.startsWith("--")) {
      throw invalid(`unexpected positional argument: ${flag}`);
    }
    const value = raw[i + 1];
    if (value === undefined || value.startsWith("--")) {
      throw invalid(`missing value for ${flag}`);
    }
    i += 1;

    if (FLAGS.string.has(flag)) {
      out[camelize(flag)] = value;
    } else if (FLAGS.integer.has(flag)) {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw invalid(`invalid integer for ${flag}: ${value}`);
      }
      out[camelize(flag)] = parsed;
    } else if (FLAGS.repeatable.has(flag)) {
      out.availableAgentsDirs.push(value);
    } else {
      throw invalid(`unknown flag: ${flag}`);
    }
  }

  for (const req of REQUIRED) {
    if (out[camelize(req)] === undefined) {
      throw invalid(`missing required flag: ${req}`);
    }
  }

  out.logLevel = out.logLevel || "warn";
  if (!["error", "warn", "info", "debug"].includes(out.logLevel)) {
    throw invalid(`invalid --log-level: ${out.logLevel}`);
  }

  return out;
}

function camelize(flag) {
  return flag
    .replace(/^--/, "")
    .replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
}

function invalid(message) {
  const err = new Error(message);
  err.exitCode = 2;
  return err;
}

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

export function createLogger(level) {
  const threshold = LEVELS[level] ?? 1;
  return {
    error: (msg) => LEVELS.error <= threshold && write("error", msg),
    warn: (msg) => LEVELS.warn <= threshold && write("warn", msg),
    info: (msg) => LEVELS.info <= threshold && write("info", msg),
    debug: (msg) => LEVELS.debug <= threshold && write("debug", msg),
  };
}

function write(level, message) {
  process.stderr.write(`[dev-review-gen] ${level} ${message}\n`);
}
