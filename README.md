# try-claude-code

Claude Code와 Codex를 같이 굴려보면서 워크플로, 스킬, 플러그인, CLI를 실험하는 저장소입니다.

완성된 제품 소개 페이지라기보다는, "어떤 구조가 더 덜 번거롭고 더 재현 가능하게 돌아가나"를 계속 확인해보는 작업대에 가깝습니다.

## 어떤 걸 실험하나요?

- Codex planning skill로 요청을 어떻게 분해할지 실험합니다.
- Claude Code/plugin skill로 구현 역할을 어떻게 나눌지 살펴봅니다.
- `tcp`, `tcf`, `tcb` 같은 CLI로 scaffold 규칙을 얼마나 강하게 밀어넣을 수 있는지 확인합니다.
- `profiles/*`로 네이밍, 경로, 템플릿 규칙을 문서가 아니라 실행기로 옮길 수 있는지 정리합니다.

## 지금은 어떤 구성인가요?

- `.codex/skills`: 계획, 요구사항 정리, 테스트 계획
- `plugin/skills`, `plugin/agents`: 구현 역할과 실행 흐름
- `packages/tcp`, `packages/tcf`, `packages/tcb`: publisher/frontend/backend용 CLI
- `packages/dev-cli`: 공통 런타임
- `profiles/*`: 생성 규칙과 템플릿
- `docs/*`: 설계 메모와 진화 기록

## 어떤 방향으로 업데이트되고 있나요?

[`docs/claude-code-workflow-evolution.md`](./docs/claude-code-workflow-evolution.md)를 기준으로 보면, 이 저장소는 대체로 아래 방향으로 움직이고 있습니다.

1. "문서를 읽고 기억해서 구현"하는 방식보다 "계획 스킬 -> 실행 스킬 -> CLI"로 책임을 나누는 쪽입니다.
2. 설명형 규칙보다 `profile.json`과 `dev-cli`가 실제 생성 규칙을 소유하는 쪽입니다.
3. 한 레포 안의 개인 운영체계보다 설치 가능한 plugin + CLI 조합으로 분리하는 쪽입니다.
4. 큰 공통 문서를 매번 다 읽는 구조보다, 작업별 working set을 줄이는 쪽입니다.

짧게 말하면, 더 많은 문서를 쌓는 실험이라기보다 더 적은 문맥으로도 안정적으로 같은 결과를 내는 구조를 찾는 실험에 가깝습니다.

## 빠르게 보려면

```bash
pnpm install
pnpm test:dev-cli
```

더 보고 싶다면 아래 문서부터 보시면 됩니다.

- [`docs/claude-code-workflow-evolution.md`](./docs/claude-code-workflow-evolution.md)
- [`docs/dev-cli-design.md`](./docs/dev-cli-design.md)
- [`packages/tcp/README.md`](./packages/tcp/README.md)
- [`packages/tcf/README.md`](./packages/tcf/README.md)
- [`packages/tcb/README.md`](./packages/tcb/README.md)
