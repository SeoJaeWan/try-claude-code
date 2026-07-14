# Project Instructions — try-Codex

## 프로젝트 기준

- Codex 커스텀 스킬과 플러그인을 개발·검증하는 워크스페이스다.
- 메인 사용자-facing 제품은 `codex-plugin/plugins/workbench/`다.
- 현재 구조와 책임 경계의 기준 문서는 `docs/current-architecture.md`다.
- `.agent/`는 Fable 5 같은 행동 원칙과 장기 참고자료의 원천이며 자동 지침 진입점이 아니다.

## 영역별 소유권

- `codex-plugin/plugins/workbench/` — Workbench manifest, skills, MCP 설정, tools
- `codex-plugin/.agents/plugins/marketplace.json` — 현재 Codex marketplace 등록
- `.codex/AGENTS.md`와 `.codex/skills/evaluate-workbench/` — 보호 경계와 project-local Workbench 성능 벤치마크
- `.claude/CLAUDE.md` — 이 파일을 import하는 Claude Code 전용 어댑터
- `.github/workflows/workbench-test.yml` — 활성 Workbench CI
- `docs/` — 현재 구조와 사용 중인 문서만 유지
- `legacy/` — Claude Code 플러그인, 과거 Codex planning stack·plan·CI·문서의 보관 영역

## 보호 영역

- Do NOT create, edit, move, or delete files under `.codex/` without explicit user approval.
- Keep `.codex/` limited to `AGENTS.md` and `skills/evaluate-workbench/`; do not add other project-local skills, tools, artifacts, config, or wiki clones there without explicit user approval.
- Treat `legacy/old/codex-planning-stack/dev-wiki/source/` and `legacy/old/codex-planning-stack/plan-wiki/source/` as repositories with Git boundaries separate from the root repository.
- Do NOT mix `codex-plugin/` implementation changes with `.codex/` maintenance unless the requested work explicitly requires both, including moving or updating the Workbench evaluator.
- Do NOT treat files under `legacy/` as active product entrypoints or current workflow contracts.

## 스킬 컨벤션

- Prefer explicit negative constraints using `Do NOT` when a prohibited behavior must be unambiguous.
- `SKILL.md` frontmatter requires `name` and `description`; `model` and `allowed-tools` are optional.
- Include Korean trigger phrases for skills intended for Korean users.
- Keep skill entrypoints concise and move detailed procedures, schemas, and tool guidance to directly linked `references/` files.

## 작업 규칙

- Preserve existing user changes and keep unrelated cleanup out of the current work unit.
- Use focused validation for the touched surface, then run broader checks only when they are relevant and currently valid.
- Use `npm test` for the active Workbench Node and Ruby test suite.
- Do NOT commit, push, publish, or open a PR unless the user explicitly asks.
