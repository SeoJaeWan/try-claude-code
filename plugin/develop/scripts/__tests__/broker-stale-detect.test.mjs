// Unit tests for matchesBrokerStaleModelSignature — the predicate that
// gates the broker-staleness attribution path in runStopReview.
//
// Empirically the broker-staleness scenario looks like this: OpenAI returns
// `{type:"error", status:400, error:{type:"invalid_request_error",
// message:"The 'gpt-5.5' model requires a newer version of Codex..."}}` and
// codex relays it as a turn error with no final message. The predicate must
// only fire on this exact shape so the recovery (which kills the broker) is
// never triggered by unrelated failures.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { matchesBrokerStaleModelSignature } from "../stop-review-gate-hook.mjs";

describe("matchesBrokerStaleModelSignature", () => {
  it("matches the canonical gpt-5.5 broker-staleness failure", () => {
    const result = {
      finalMessage: "",
      error: {
        message:
          'invalid_request_error: The \'gpt-5.5\' model requires a newer version of Codex. Please upgrade to the latest app or CLI and try again.',
      },
      stderr: "",
    };
    assert.equal(matchesBrokerStaleModelSignature(result), true);
  });

  it("matches when the signal arrives via stderr instead of error.message", () => {
    const result = {
      finalMessage: "",
      error: null,
      stderr:
        '{"type":"error","status":400,"error":{"type":"invalid_request_error","message":"The \'gpt-5.5\' model requires a newer version of Codex."}}',
    };
    assert.equal(matchesBrokerStaleModelSignature(result), true);
  });

  it("does not match when codex actually answered (finalMessage present)", () => {
    // Stale broker should never produce a real answer; if one came through,
    // a recovery would corrupt the in-progress conversation.
    const result = {
      finalMessage:
        "ALLOW: looks fine. (You might want a newer version of Codex for the new model.)",
      error: null,
      stderr: "",
    };
    assert.equal(matchesBrokerStaleModelSignature(result), false);
  });

  it("does not match plain 'newer version' hints without invalid_request_error", () => {
    // Local CLI warnings and unrelated upgrade notices must not trigger a
    // broker kill.
    const result = {
      finalMessage: "",
      error: { message: "Codex CLI hint: a newer version of Codex is available." },
      stderr: "",
    };
    assert.equal(matchesBrokerStaleModelSignature(result), false);
  });

  it("does not match generic invalid_request_error (bad payload, missing field)", () => {
    const result = {
      finalMessage: "",
      error: { message: "invalid_request_error: missing required field 'input'." },
      stderr: "",
    };
    assert.equal(matchesBrokerStaleModelSignature(result), false);
  });

  it("does not match authentication errors", () => {
    const result = {
      finalMessage: "",
      error: { message: "authentication_error: invalid API key" },
      stderr: "",
    };
    assert.equal(matchesBrokerStaleModelSignature(result), false);
  });

  it("does not match network errors", () => {
    const result = {
      finalMessage: "",
      error: { message: "Network error: ECONNRESET while reading response" },
      stderr: "",
    };
    assert.equal(matchesBrokerStaleModelSignature(result), false);
  });

  it("returns false for empty / null inputs without throwing", () => {
    assert.equal(matchesBrokerStaleModelSignature({ finalMessage: "", error: null, stderr: "" }), false);
    assert.equal(matchesBrokerStaleModelSignature(null), false);
    assert.equal(matchesBrokerStaleModelSignature(undefined), false);
  });

  it("matches case-insensitively on both signal tokens", () => {
    const result = {
      finalMessage: "",
      error: { message: "INVALID_REQUEST_ERROR: 'foo' model requires a NEWER VERSION OF CODEX." },
      stderr: "",
    };
    assert.equal(matchesBrokerStaleModelSignature(result), true);
  });
});
