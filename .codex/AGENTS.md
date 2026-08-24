# `.codex/` 영역 지침

## 역할

- `.codex/`에는 이 `AGENTS.md`와 project-local `config.toml`만 유지한다.
- `config.toml`은 이 저장소에서만 적용되는 Codex runtime 설정을 소유하며, Workbench 병렬 task 실행을 위해 agent thread 한도를 20으로 둔다.
- 현재 사용자-facing skill과 runtime 구현은 `codex-plugin/plugins/workbench/`가 소유한다.
- 과거 project-local planning stack, artifacts, tools, wiki 설정은 `legacy/old/codex-planning-stack/`에 보관한다.

## 편집 규칙

- Do NOT create, edit, move, or delete `.codex/` content without explicit user approval.
- Do NOT add project-local skills, tools, artifacts, additional config files, or wiki clones under `.codex/` without explicit user approval.
- Do NOT treat `legacy/old/codex-planning-stack/` as an active Workbench entrypoint.
- After an approved change, verify that `.codex/` contains only `AGENTS.md` and `config.toml`.
