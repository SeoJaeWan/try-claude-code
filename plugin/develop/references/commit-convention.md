# Commit Message Convention

Single source of truth for commit rules used by every skill and agent in `plugin/develop/` that produces git commits. Consumers should reference this file rather than restating the rules inline — except for the minimal guarantees that subagents need to see in their dispatch prompt, which are intentionally duplicated because subagents often cannot reach out to read external files.

---

## Format

```
{type}(scope): {description}
```

- `scope` is optional. Include it when the change is clearly localized to a module, package, or surface (e.g. `feat(auth): ...`, `fix(runner): ...`). Omit it for cross-cutting changes.
- `description` uses imperative mood (`add`, `fix`, `remove`, `rename`), not past tense or gerund.
- Keep the subject concise. ≤72 characters works everywhere; ≤50 characters is the preferred ceiling.

### Allowed types

`feat` · `fix` · `refactor` · `docs` · `chore` · `style` · `test`

- `feat` — user-facing behavior added
- `fix` — user-facing behavior corrected
- `refactor` — internal change with no behavior delta
- `docs` — documentation only
- `chore` — build, tooling, deps, or metadata; non-code housekeeping
- `style` — formatting, whitespace, CSS presentation
- `test` — test additions or adjustments without production code change

### Do NOT

- Do NOT include phase identity in the subject or body — no `phase 2 — ...`, no `[Phase 2] ...`, no `2단계: ...`. The runner hook tracks phase from `Agent.description`, never from commit messages, so a phase prefix in the commit message only adds noise and confuses the developer-review UI.
- Do NOT use `git commit --amend` or `git rebase` to rewrite commits already on a task branch. Each phase ends with a fresh commit so the stop-gate and dev-review can reason about a stable history.
- Do NOT skip hooks (`--no-verify`, `--no-gpg-sign`, etc.). A failing hook is signal — fix the underlying issue.

---

## Body

The body is optional in general but **required** for runner phase agents and dev-review rework agents — it is surfaced verbatim in the developer-review UI, so reviewers read it as the rationale for the change.

- 1 to 2 lines, explaining **why** (not what). The diff already shows what.
- Leave one blank line between subject and body.
- Any language is fine in the body (subject may stay English for tooling compatibility).

### Per-consumer body policy

| Consumer | Body policy |
|---|---|
| `/commit` skill (user-triggered casual commits) | **Omit** body. Subject only. Strict ≤50 characters. |
| `runner` phase agent (per-phase commit in task worktree) | **Required.** 1~2 line WHY body. |
| `dev-review` rework agent (re-dispatched on needs-change) | **Required.** 1~2 line WHY body describing what the reviewer feedback asked for and why the change addresses it. |

---

## Footer

- `BREAKING CHANGE: <description>` for compatibility-breaking changes.
- Issue references: `Closes #123`, `Refs #456`.

Footers are optional and rarely needed for phase commits inside a task branch.

---

## Examples

Good:

```
feat(auth): add JWT-based login endpoint

the existing session cookie flow does not work for the mobile client;
JWT gives us a stateless bearer token usable from both web and native.
```

```
fix(ui): align describedBy with FramedStyle id rule

consumers picked id-supporting while FramedStyle rendered id-message
for non-default tone with supporting-only, breaking the aria reference.
```

Bad (phase prefix in subject):

```
feat(ui): phase 2 — add JWT-based login endpoint
fix(ui): [Phase 2] align describedBy with FramedStyle id rule
```

Bad (describes what, not why):

```
feat(auth): add JWT-based login endpoint

added a new route, added a token signer, added a refresh handler.
```

---

## Pointer summary for consumers

- `plugin/develop/skills/commit/SKILL.md` — user-triggered `/commit` flow
- `plugin/develop/skills/runner/SKILL.md` — phase agent dispatch embeds the minimal guarantees inline; full rules here
- `plugin/develop/skills/dev-review/SKILL.md` — rework re-dispatch embeds the same minimal guarantees inline; full rules here
