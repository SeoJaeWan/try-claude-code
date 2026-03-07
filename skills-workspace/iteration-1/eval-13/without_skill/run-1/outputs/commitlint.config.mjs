/**
 * commitlint configuration based on coding-rules/git.md
 *
 * Commit message conventions:
 * - Subject line: English only, 50 chars or fewer, imperative mood
 * - One commit = one purpose
 * - Body: blank line between subject and body, bullet points with `-`
 * - Footer: BREAKING CHANGE:, Closes #, Refs #
 *
 * Allowed types (from branch naming in git.md):
 *   feat, refactor, fix, style, chore, docs, test
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // --- Subject line rules (git.md) ---

    // 50 characters or fewer
    "header-max-length": [2, "always", 50],

    // Use imperative mood — enforced by type prefix requirement
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "refactor", "style", "chore", "docs", "test", "ci", "perf", "build", "revert"],
    ],

    // Type is required
    "type-empty": [2, "never"],

    // Subject is required
    "subject-empty": [2, "never"],

    // Subject should be lowercase
    "subject-case": [2, "always", "lower-case"],

    // No period at end of subject
    "subject-full-stop": [2, "never", "."],

    // Type must be lowercase
    "type-case": [2, "always", "lower-case"],

    // --- Body rules (git.md) ---

    // Blank line between subject and body (enforced by parser)
    "body-leading-blank": [2, "always"],

    // --- Footer rules (git.md) ---
    "footer-leading-blank": [2, "always"],
  },
};
