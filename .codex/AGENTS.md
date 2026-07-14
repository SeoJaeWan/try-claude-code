# `.codex/` 영역 지침

## 역할

- `.codex/`에는 이 `AGENTS.md`와 project-local `skills/evaluate-workbench/`만 유지한다.
- 현재 사용자-facing skill과 runtime 구현은 `codex-plugin/plugins/workbench/`가 소유한다.
- `skills/evaluate-workbench/`는 Workbench 배포물과 분리된 이 저장소 전용 성능 벤치마크다.
- 과거 project-local planning stack, artifacts, tools, wiki 설정은 `legacy/old/codex-planning-stack/`에 보관한다.

## 편집 규칙

- Do NOT create, edit, move, or delete `.codex/` content without explicit user approval.
- Do NOT add project-local skills other than `evaluate-workbench`, tools, artifacts, config, or wiki clones under `.codex/` without explicit user approval.
- Do NOT treat `legacy/old/codex-planning-stack/` as an active Workbench entrypoint.
- After an approved change, verify that `.codex/` contains only `AGENTS.md` and `skills/evaluate-workbench/`.
