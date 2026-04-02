# Project Memory - try-claude-code

## 프로젝트 개요
- Claude Code 커스텀 스킬 워크스페이스
- 스킬 개발, 테스트, 실험을 위한 프로젝트

## 디렉토리 구조
- `plugin/skills/` — 실행 가능한 스킬 (commit, pr, init-memory, backend-dev 등)
- `.codex/skills/` — 계획/설계 스킬 (architect, brainstorm, planner-lite 등)

## 컨벤션
- 스킬 작성 시 부정 명시("Do NOT") 형식 우선 사용
- SKILL.md frontmatter: name, description 필수 / model, allowed-tools 선택
- 한국어 사용자 대상 스킬은 한국어 트리거 포함
