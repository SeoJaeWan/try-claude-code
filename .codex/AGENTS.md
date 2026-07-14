# `.codex/` 영역 지침

## 역할

- `.codex/`에는 이 `AGENTS.md`만 유지한다.
- 현재 사용자-facing skill과 runtime 구현은 `codex-plugin/plugins/workbench/`가 소유한다.
- 과거 project-local planning stack, artifacts, tools, wiki 설정은 `legacy/codex-planning-stack/`에 보관한다.

## 편집 규칙

- Do NOT create, edit, move, or delete `.codex/` content without explicit user approval.
- Do NOT add project-local skills, tools, artifacts, config, or wiki clones under `.codex/`.
- Do NOT treat `legacy/codex-planning-stack/` as an active Workbench entrypoint.
- After an approved change, verify that `.codex/AGENTS.md` is the only file remaining in this directory.
