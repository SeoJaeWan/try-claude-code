#!/usr/bin/env node

import { captureHookPayload, limits } from "./lib/source-capture.mjs";

let input = "";
let oversized = false;
process.stdin.setEncoding("utf8");
try {
  for await (const chunk of process.stdin) {
    if (oversized) continue;
    input += chunk;
    if (Buffer.byteLength(input) > limits.maxHookInputBytes) {
      oversized = true;
      input = "";
    }
  }
  if (!oversized) await captureHookPayload(input).catch(() => {});
} catch {
  // Hooks are best effort and must remain invisible to the calling turn.
}
