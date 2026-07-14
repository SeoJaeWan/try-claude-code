# Commit Message Convention

Single source of truth for commit rules used by every skill and agent in `claude-plugin/develop/` that produces git commits. Consumers should reference this file rather than restating the rules inline — except for the minimal guarantees that subagents need to see in their dispatch prompt, which are intentionally duplicated because subagents often cannot reach out to read external files.

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

- Do NOT include phase identity in the subject or body — no `phase 2 — ...`, no `[Phase 2] ...`, no `2단계: ...`. The runner hook tracks phase from `Agent.description`, never from commit messages, so a phase prefix in the commit message only adds noise and confuses the dev-review UI.
- Do NOT use `git commit --amend` or `git rebase` to rewrite commits already on a task branch. Each phase ends with a fresh commit so the stop-gate and dev-review can reason about a stable history.
- Do NOT skip hooks (`--no-verify`, `--no-gpg-sign`, etc.). A failing hook is signal — fix the underlying issue.

---

## Body

The body is optional in general but **required** for runner phase agents and dev-review rework agents — it is surfaced verbatim in the dev-review UI, so reviewers read it as the rationale for the change.

- **Language: Korean.** Subject stays English (Conventional Commits + tooling compatibility); body is written in Korean so the dev-review UI is scannable for the Korean-speaking reviewer.
- **Default shape: exactly 2 lines.**
  - Line 1 — **무엇 (WHAT)**: 이 커밋이 한 변경의 핵심을 한 줄로.
  - Line 2 — **왜 (WHY)**: 그 변경의 동기·제약·맥락을 한 줄로. diff만으로는 드러나지 않는 정보.
- Do NOT prefix labels like `작업:` or `이유:`. Line position alone communicates the role.
- Leave one blank line between subject and body. No blank line between the two body lines.
- **Escape hatch:** for self-evident changes where a WHY line would feel forced (e.g., typo fixes, formatting-only chores, dependency version bumps with no policy choice), a single Korean WHAT line is acceptable. Use sparingly — when in doubt, write both lines.

### Per-consumer body policy

| Consumer | Body policy |
|---|---|
| `/commit` skill (user-triggered casual commits) | **Omit** body. Subject only. Strict ≤50 characters. |
| `runner` phase agent (per-phase commit in task worktree) | **Required.** 한국어 2줄 (WHAT + WHY). 자명한 변경은 1줄 WHAT 허용. |
| `dev-review` rework agent (re-dispatched on needs-change) | **Required.** 한국어 2줄 — Line 1은 리뷰 피드백이 요구한 변경, Line 2는 그 변경이 피드백을 어떻게 해소하는지. |

---

## Footer

- `BREAKING CHANGE: <description>` for compatibility-breaking changes.
- Issue references: `Closes #123`, `Refs #456`.

Footers are optional and rarely needed for phase commits inside a task branch.

---

## Examples

Good (runner phase / dev-review rework — 한국어 2줄):

```
feat(auth): add JWT-based login endpoint

JWT 기반 로그인 라우트와 토큰 서명·갱신 핸들러를 추가.
모바일 클라이언트에서 세션 쿠키 흐름이 동작하지 않아 stateless bearer 토큰이 필요했음.
```

```
fix(ui): align describedBy with FramedStyle id rule

FramedStyle의 id-message 규칙에 맞춰 consumer의 describedBy를 id-supporting → id-message로 정렬.
non-default tone에서 supporting-only로 렌더되어 aria 참조가 깨지던 회귀를 차단.
```

Good (escape hatch — 자명한 변경, WHAT 1줄):

```
chore(deps): bump zod to 3.23.8

zod 3.23.7 → 3.23.8 패치 버전 동기화.
```

Bad (phase prefix in subject):

```
feat(ui): phase 2 — add JWT-based login endpoint
fix(ui): [Phase 2] align describedBy with FramedStyle id rule
```

Bad (영어 body — runner/dev-review 컨텍스트에서는 한국어가 규칙):

```
feat(auth): add JWT-based login endpoint

added a new route, added a token signer, added a refresh handler.
```

Bad (라벨 사용 — 노이즈만 늘림):

```
feat(auth): add JWT-based login endpoint

작업: JWT 로그인 라우트 추가.
이유: 모바일 클라이언트가 세션 쿠키를 못 쓰기 때문.
```

---

## Pointer summary for consumers

- `claude-plugin/develop/skills/commit/SKILL.md` — user-triggered `/commit` flow
- `claude-plugin/develop/skills/runner/SKILL.md` — phase agent dispatch embeds the minimal guarantees inline; full rules here
- `claude-plugin/develop/skills/dev-review/SKILL.md` — rework re-dispatch embeds the same minimal guarantees inline; full rules here
