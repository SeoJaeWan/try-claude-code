#!/usr/bin/env node
// Cross-platform replacement for `mkdir -p <dst> && cp -r <src>/. <dst>/`.
// Copies the contents of <src> INTO <dst>, creating <dst> if needed.
// Used by the runner skill to seed a task worktree with its plan folder
// without depending on `cp`/`mkdir -p` (which are Bash-only on Windows).
//
// Usage:
//   node plan-copy.mjs <src-dir> <dst-dir>
//
// Exit codes:
//   0 — copy completed
//   1 — source missing or not a directory
//   2 — invalid arguments

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function usage() {
  process.stderr.write("usage: node plan-copy.mjs <src-dir> <dst-dir>\n");
  process.exit(2);
}

function main() {
  const [, , src, dst] = process.argv;
  if (!src || !dst) {
    usage();
  }
  const absSrc = path.resolve(src);
  const absDst = path.resolve(dst);
  if (!fs.existsSync(absSrc)) {
    process.stderr.write(`plan-copy: source not found: ${absSrc}\n`);
    process.exit(1);
  }
  if (!fs.statSync(absSrc).isDirectory()) {
    process.stderr.write(`plan-copy: source is not a directory: ${absSrc}\n`);
    process.exit(1);
  }
  fs.mkdirSync(absDst, { recursive: true });
  // cpSync with recursive: true copies the entire subtree of src into dst.
  // force: true overwrites any existing files in dst (matches `cp -r` semantics).
  fs.cpSync(absSrc, absDst, { recursive: true, force: true, errorOnExist: false });
  process.stdout.write(`plan-copy: ${absSrc.replace(/\\/g, "/")} -> ${absDst.replace(/\\/g, "/")}\n`);
}

main();
