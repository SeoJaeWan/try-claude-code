# Legacy Codex Planning Stack

이 디렉터리는 과거 project-local `.codex/` planning/wiki stack을 보관한다. 현재 Workbench의 runtime, marketplace, CI, 테스트 입력이 아니다.

- `skills/`, `tools/`, `artifacts/`, `config.toml`은 이전 `.codex/`의 추적 파일이다.
- `dev-wiki/source/`와 `plan-wiki/source/`는 각 원격 저장소를 유지하는 별도 Git clone이며 root repository에서는 ignore한다.
- 현재 사용자-facing 구현은 `codex-plugin/plugins/workbench/`를 기준으로 한다.
