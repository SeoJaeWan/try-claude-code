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
import { BROKER_BUSY_RPC_CODE, BROKER_ENDPOINT_ENV, CodexAppServerClient } from "./app-server.mjs";

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
  let client = null;
  try {
    client = await CodexAppServerClient.connect(cwd);
    const result = await fn(client);
    await client.close();
    return result;
  } catch (error) {
    const brokerRequested = client?.transport === "broker" || Boolean(process.env[BROKER_ENDPOINT_ENV]);
    const shouldRetryDirect =
      (client?.transport === "broker" && error?.rpcCode === BROKER_BUSY_RPC_CODE) ||
      (brokerRequested && (error?.code === "ENOENT" || error?.code === "ECONNREFUSED"));

    if (client) {
      await client.close().catch(() => {});
      client = null;
    }

    if (!shouldRetryDirect) throw error;

    const directClient = await CodexAppServerClient.connect(cwd, { disableBroker: true });
    try {
      return await fn(directClient);
    } finally {
      await directClient.close();
    }
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

// Ask the live codex app-server which models it currently considers available.
// Used by stop-review-gate-hook's broker-staleness attribution path: when a
// turn fails with the "newer version of Codex" wording, we cross-check the
// rejected model slug against this list. If it is absent, the broker's
// long-lived codex child is operating on a stale models snapshot and must be
// restarted; if present, the failure has a different cause and falls through
// to the existing diagnostic message.
//
// Returns a Set<string> of model ids the local codex knows about. Empty Set
// on unexpected response shape — callers should treat empty as "unknown" and
// skip attribution rather than misclassify.
export async function listAvailableModels(cwd) {
  return withAppServer(cwd, async (client) => {
    const response = await client.request("model/list", {});
    const data = Array.isArray(response?.data) ? response.data : [];
    const ids = new Set();
    for (const entry of data) {
      const id = entry?.id ?? entry?.model;
      if (typeof id === "string" && id) ids.add(id);
    }
    return ids;
  });
}
