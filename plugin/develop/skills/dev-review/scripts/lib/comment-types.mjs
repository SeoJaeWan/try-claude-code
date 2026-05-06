// Dev-review comment-type vocabulary.
//
// This is the SSOT for the three actionable comment types the reviewer can
// attach in the browser UI. The vocabulary is shared by:
//
//   - server.mjs            — request validation, dispatch_agent rules,
//                              submit-time guardrails.
//   - assets/index.html     — option labels, CSS class names, badge text
//                              (the browser keeps raw strings because the
//                              values double as CSS class fragments and the
//                              HTTP payload format).
//   - SKILL.md / references — documentation refers to the same string values.
//
// Keep the literal values in lock-step with index.html and the schema doc.
// Renaming any value is a breaking change for stored feedback.json files.
//
// Why "neutral comment" is absent: every comment is either actionable
// (needs-change, question) or recorded-but-ignored (out-of-scope). A plain
// note has no place in this workflow — see review-data-schema.md.

export const COMMENT_TYPE = Object.freeze({
  NEEDS_CHANGE: "needs-change",
  QUESTION: "question",
  OUT_OF_SCOPE: "out-of-scope",
});

export const COMMENT_TYPE_VALUES = new Set(Object.values(COMMENT_TYPE));

// Human-readable enumeration for "type must be …" error messages. Kept here
// so the wording stays in sync with the value list automatically when a new
// type is added.
export const COMMENT_TYPE_LIST_TEXT = Object.values(COMMENT_TYPE).join(" | ");
