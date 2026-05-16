/**
 * Codex app-server client — minimal surface used by the stop-review gate.
 *
 * The pre-cleanup version of this module carried a rich turn-capture state
 * machine (per-item progress callbacks, reasoning-section merging, subagent
 * thread tracking, file/command listing) that existed so codex-companion.mjs
 * could render task progress to the user. codex-companion has been removed
 * and the only remaining consumer is the Stop hook, which needs three things
 * from a Codex turn:
 *
 *   1. Open a fresh or resumed thread.
 *   2. Send a single prompt and wait until the turn finishes.
 *   3. Receive the agent's final message as a string.
 *
 * Everything beyond that has been pruned.
 *
 * @typedef {import("./app-server-protocol").ThreadResumeParams} ThreadResumeParams
 * @typedef {import("./app-server-protocol").ThreadStartParams} ThreadStartParams
 * @typedef {import("./app-server-protocol").Turn} Turn
 * @typedef {import("./app-server-protocol").UserInput} UserInput
 */
import process from "node:process";

import { CodexAppServerClient } from "./app-server.mjs";
import { terminateProcessTree } from "./process.mjs";
import { STOP_REVIEW_OUTCOME } from "./stop-review-outcome.mjs";

const SERVICE_NAME = "claude_code_codex_plugin";

function cleanCodexStderr(stderr) {
  return stderr
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.startsWith("WARNING: proceeding, even though we could not update PATH:"))
    .join("\n");
}

/** @returns {ThreadStartParams} */
function buildThreadParams(cwd, options = {}) {
  return {
    cwd,
    model: options.model ?? null,
    approvalPolicy: options.approvalPolicy ?? "never",
    sandbox: options.sandbox ?? "read-only",
    serviceName: SERVICE_NAME,
    ephemeral: options.ephemeral ?? true,
    experimentalRawEvents: false,
  };
}

/** @returns {ThreadResumeParams} */
function buildResumeParams(threadId, cwd, options = {}) {
  return {
    threadId,
    cwd,
    model: options.model ?? null,
    approvalPolicy: options.approvalPolicy ?? "never",
    sandbox: options.sandbox ?? "read-only",
  };
}

/** @returns {UserInput[]} */
function buildTurnInput(prompt) {
  return [{ type: "text", text: prompt, text_elements: [] }];
}

function extractThreadId(message) {
  return message?.params?.threadId ?? null;
}

// Minimal turn capture: ignore notifications from subagent threads, watch the
// root thread for agent_message items and wait for `turn/completed`. The Stop
// hook only needs the final agent text plus the turn status — no progress
// reporter, no item state machine, no reasoning extraction.
async function captureTurn(client, threadId, startRequest) {
  const previousHandler = client.notificationHandler;
  let lastAgentMessage = "";
  let finalTurn = null;
  let error = null;
  let resolved = false;

  return new Promise((resolve, reject) => {
    const finish = (rejection) => {
      if (resolved) return;
      resolved = true;
      client.setNotificationHandler(previousHandler ?? null);
      if (rejection) reject(rejection);
      else resolve({ lastAgentMessage, finalTurn, error });
    };

    client.setNotificationHandler((message) => {
      const messageThreadId = extractThreadId(message);
      if (messageThreadId && messageThreadId !== threadId) {
        // Subagent notification — forward to whatever handler was set before.
        if (previousHandler) previousHandler(message);
        return;
      }
      const method = message.method;
      const params = message.params ?? {};
      if (method === "item/completed") {
        const item = params.item;
        if (item?.type === "agentMessage" && typeof item.text === "string" && item.text) {
          lastAgentMessage = item.text;
        }
      } else if (method === "error") {
        error = params.error;
      } else if (method === "turn/completed") {
        finalTurn = params.turn ?? { status: "completed" };
        finish(null);
      }
    });

    startRequest()
      .then((response) => {
        // Some servers reply with `turn` already settled (e.g. immediate failure).
        if (response?.turn?.status && response.turn.status !== "inProgress") {
          finalTurn = response.turn;
          finish(null);
        }
      })
      .catch((err) => finish(err));
  });
}

async function withAppServer(cwd, fn) {
  const client = await CodexAppServerClient.connect(cwd);
  try {
    return await fn(client);
  } finally {
    await client.close().catch(() => {});
  }
}

async function startThread(client, cwd, options = {}) {
  const response = await client.request("thread/start", buildThreadParams(cwd, options));
  return response;
}

async function resumeThread(client, threadId, cwd, options = {}) {
  return client.request("thread/resume", buildResumeParams(threadId, cwd, options));
}

// Run a single turn against the app-server. Used by the Stop hook for
// stop-review Codex calls. Returns the final message, turn metadata, and
// transport stderr; no progress callbacks.
export async function runAppServerTurn(cwd, options = {}) {
  return withAppServer(cwd, async (client) => {
    let threadId;
    if (options.resumeThreadId) {
      const response = await resumeThread(client, options.resumeThreadId, cwd, {
        model: options.model,
        sandbox: options.sandbox,
        ephemeral: false,
      });
      threadId = response.thread.id;
    } else {
      const response = await startThread(client, cwd, {
        model: options.model,
        sandbox: options.sandbox,
        ephemeral: options.persistThread ? false : true,
      });
      threadId = response.thread.id;
    }

    const prompt = options.prompt?.trim() || "";
    if (!prompt) throw new Error("A prompt is required for this Codex run.");

    const captured = await captureTurn(client, threadId, () =>
      client.request("turn/start", {
        threadId,
        input: buildTurnInput(prompt),
        model: options.model ?? null,
        effort: options.effort ?? null,
        outputSchema: options.outputSchema ?? null,
      }),
    );

    return {
      status: captured.finalTurn?.status === "completed" ? 0 : 1,
      threadId,
      finalMessage: captured.lastAgentMessage,
      turn: captured.finalTurn,
      error: captured.error,
      stderr: cleanCodexStderr(client.stderr),
    };
  });
}

// ---------------------------------------------------------------------------
// Stop-review entry point — used by stop-review-gate-hook.mjs
// ---------------------------------------------------------------------------
//
// `review` is the single function the Stop hook calls. Each invocation spawns
// a fresh Codex CLI subprocess via CodexAppServerClient (no broker daemon, no
// warm-thread reuse across calls). Encapsulates timeout, parsing,
// confidence-threshold parsing, and ENOENT→SKIPPED. The hook only chooses
// between the returned outcomes.

const DEFAULT_REVIEW_TIMEOUT_MS = 15 * 60 * 1000;
const CONFIDENCE_THRESHOLD = 7;

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error("ETIMEDOUT");
        err.code = "ETIMEDOUT";
        reject(err);
      }, ms);
      timer.unref?.();
    }),
  ]).finally(() => clearTimeout(timer));
}

// Extract a model slug from the server error message, e.g.
//   "The 'gpt-5.5' model requires a newer version of Codex..."
function extractModelSlugFromError(text) {
  const match = String(text ?? "").match(/['"]([^'"]+)['"]\s+model/i);
  return match ? match[1] : null;
}

function diagnoseCodexFailure(result) {
  const errorMessage = String(result?.error?.message ?? result?.error ?? "").trim();
  const stderrText = String(result?.stderr ?? "").trim();
  const combined = `${errorMessage}\n${stderrText}`;
  if (!errorMessage && !stderrText) return null;
  if (/requires? a newer version of (?:the )?(?:Codex|app|CLI)|please upgrade.*Codex|newer version of Codex/i.test(combined)) {
    const detail = errorMessage || stderrText.split(/\r?\n/).find((l) => l.includes("requires")) || stderrText.split(/\r?\n/, 1)[0];
    const modelSlug = extractModelSlugFromError(detail);
    const modelLine = modelSlug ? `문제 모델: \`${modelSlug}\`` : null;
    const lines = ["Codex 서버가 모델 호환성 오류를 반환했습니다."];
    if (modelLine) lines.push(modelLine);
    lines.push(
      "",
      "다음 중 하나입니다:",
      "",
      "1) Codex CLI 자체가 구버전 — 터미널에서 `codex --version` 확인,",
      "   npm latest와 다르면 `npm i -g @openai/codex@latest`",
    );
    if (modelSlug) {
      lines.push(
        "",
        `2) \`~/.codex/config.toml\`의 \`model\` 슬러그(\`${modelSlug}\`)가 잘못됐거나`,
        "   현재 CLI가 인식하지 못함 — 터미널에서 그냥 `codex`를 실행했을 때",
        `   \`model: ${modelSlug}\`이 활성으로 표시되는지 확인.`,
      );
    } else {
      lines.push(
        "",
        "2) `~/.codex/config.toml`의 `model` 슬러그 점검 — 터미널에서 `codex`를",
        "   실행했을 때 활성 모델로 표시되는지 확인.",
      );
    }
    lines.push(
      "",
      "3) OpenAI 측 일시 게이팅 — 1, 2가 정상이라면 잠시 후 자동 재시도.",
      "",
      `원본 에러: ${detail}`,
    );
    return lines.join("\n");
  }
  if (errorMessage) return `Codex 측 에러로 리뷰가 완료되지 않았습니다: ${errorMessage}`;
  return null;
}

function partitionFindingsByConfidence(text) {
  const confRe = /\[conf\s+(\d+)\]/i;
  const highFindings = [];
  const lowFindings = [];
  let taggedCount = 0;
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(confRe);
    if (!match) continue;
    taggedCount += 1;
    if (Number(match[1]) >= CONFIDENCE_THRESHOLD) highFindings.push(line);
    else lowFindings.push(line);
  }
  return { highFindings, lowFindings, taggedCount };
}

// Parse the agent's final message into a structured outcome. Returns the
// shape Stop hook downstream consumes — outcome string + reason + optional
// suppressedNote (the original BLOCK text when high-confidence findings are
// absent and the outcome downgrades to ALLOW_DOWNGRADED).
function parseFinalMessage(raw) {
  const text = String(raw ?? "").trim();
  if (!text) {
    return {
      outcome: STOP_REVIEW_OUTCOME.BLOCK,
      reason: "The stop-time Codex review task returned no final output.",
      suppressedNote: null,
    };
  }
  const firstLine = text.split(/\r?\n/, 1)[0].trim();
  if (firstLine.startsWith("ALLOW:")) {
    return { outcome: STOP_REVIEW_OUTCOME.ALLOW, reason: null, suppressedNote: null };
  }
  if (firstLine.startsWith("BLOCK:")) {
    const { highFindings, lowFindings, taggedCount } = partitionFindingsByConfidence(text);
    if (taggedCount === 0) {
      return { outcome: STOP_REVIEW_OUTCOME.BLOCK, reason: text, suppressedNote: null };
    }
    if (highFindings.length === 0) {
      return {
        outcome: STOP_REVIEW_OUTCOME.ALLOW_DOWNGRADED,
        reason: null,
        suppressedNote: text,
      };
    }
    const filteredReason = [firstLine, "", ...highFindings]
      .concat(lowFindings.length > 0 ? ["", `(Low-confidence findings suppressed: ${lowFindings.length})`] : [])
      .join("\n");
    return {
      outcome: STOP_REVIEW_OUTCOME.BLOCK,
      reason: filteredReason,
      suppressedNote: lowFindings.length > 0 ? text : null,
    };
  }
  return {
    outcome: STOP_REVIEW_OUTCOME.BLOCK,
    reason: "The stop-time Codex review task returned an unexpected answer.",
    suppressedNote: null,
  };
}

// Single entry point for stop-review. Encapsulates fresh-spawn Codex turn,
// timeout, parsing, and ENOENT→SKIPPED. Returns:
//
//   {
//     outcome: 'allow' | 'allow_downgraded' | 'block' | 'timeout' | 'skipped',
//     reason: string | null,        // BLOCK/TIMEOUT body
//     suppressedNote: string | null,// downgrade source / low-conf body
//     raw: string | null,           // raw final-message for record-CLI
//   }
export async function review({ prompt, cwd = null, timeoutMs = DEFAULT_REVIEW_TIMEOUT_MS } = {}) {
  if (!prompt || !String(prompt).trim()) {
    throw new Error("codex.review: prompt is required");
  }
  const turnCwd = cwd || process.cwd();
  const turnOptions = { prompt, sandbox: "read-only", persistThread: false };

  let result = null;
  try {
    result = await withTimeout(runAppServerTurn(turnCwd, turnOptions), timeoutMs);

    // Empty final message + a diagnostic-worthy error → BLOCK with the
    // human-readable diagnostic as the reason.
    const finalText = String(result.finalMessage ?? "").trim();
    if (!finalText) {
      const diagnosed = diagnoseCodexFailure(result);
      if (diagnosed) {
        return {
          outcome: STOP_REVIEW_OUTCOME.BLOCK,
          reason: diagnosed,
          suppressedNote: null,
          raw: null,
        };
      }
    }

    const parsed = parseFinalMessage(result.finalMessage);
    return {
      outcome: parsed.outcome,
      reason: parsed.reason,
      suppressedNote: parsed.suppressedNote,
      raw: result.finalMessage ?? null,
    };
  } catch (error) {
    if (error.code === "ETIMEDOUT") {
      return {
        outcome: STOP_REVIEW_OUTCOME.TIMEOUT,
        reason: "The stop-time Codex review task timed out after 15 minutes.",
        suppressedNote: null,
        raw: null,
      };
    }
    const errText = error instanceof Error ? error.message : String(error);
    const isMissingCodex =
      error?.code === "ENOENT" ||
      /\bcodex\b.*not (?:recognized|found)|command not found.*codex|ENOENT/i.test(errText);
    if (isMissingCodex) {
      process.stderr.write("[codex.review] Codex CLI unavailable — skipping stop-time review.\n");
      return { outcome: STOP_REVIEW_OUTCOME.SKIPPED, reason: null, suppressedNote: null, raw: null };
    }
    return {
      outcome: STOP_REVIEW_OUTCOME.BLOCK,
      reason: errText
        ? `The stop-time Codex review task failed: ${errText}`
        : "The stop-time Codex review task failed.",
      suppressedNote: null,
      raw: null,
    };
  }
}

