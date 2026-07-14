# try-Codex

Codex Workbench 플러그인을 개발·검증하는 저장소입니다. 현재 사용자-facing 제품은 [`codex-plugin/plugins/workbench/`](./codex-plugin/plugins/workbench/)이며, 이전 Claude Code 플러그인과 project-local Codex planning stack은 [`legacy/`](./legacy/)에 보관합니다.

현재 구조와 책임 경계의 기준 문서는 [`docs/current-architecture.md`](./docs/current-architecture.md)입니다.

## 저장소 구조

```text
.
├── .agent/                         # Workbench 행동 원칙 원본
├── .claude/                        # Claude가 이 저장소를 읽을 때의 지침
├── .codex/
│   └── AGENTS.md                   # .codex 보호 경계
├── .github/                        # Workbench CI
├── codex-plugin/                   # 메인 제품
├── docs/
│   └── current-architecture.md     # 현재 구조의 canonical 문서
├── legacy/
│   ├── claude-code/                # 과거 Claude plugin, plans, CI
│   ├── codex-planning-stack/       # 과거 .codex planning/wiki stack
│   └── docs/                       # 역사 문서와 참고자료
├── AGENTS.md
├── README.md
├── package.json
└── .gitignore
```

## Codex Workbench

| 스킬 | 역할 |
|---|---|
| `issue-brief` | 프롬프트, 이슈, QA·API·디자인 근거를 Work Unit으로 정리 |
| `brainstorm` | 선택한 Work Unit의 현재 상태, 위험, 진단·구현 메모 검토 |
| `test-brief` | 구현 전 contract/regression test 또는 측정 기준 작성 |
| `executor` | 선택한 Work Unit 하나를 범위 내에서 구현·진단 |
| `branch-work-report` | 현재 브랜치의 커밋별 변경과 리뷰 포인트 보고 |
| `visual-grounding` | Figma·원본 UI·스크린샷과 local 구현 비교 |
| `openapi` | Swagger/OpenAPI 서비스와 endpoint 탐색·검증 |
| `dev-wiki` | 중앙 Workbench dev wiki의 setup, audit, update, lint, graph 유지 |
| `fable5` | 명시적으로 호출한 경우 fact-first 운영 원칙 적용 |

기본 흐름은 `issue-brief → brainstorm → 필요 시 test-brief → executor → branch-work-report`입니다.

## 실행

```bash
npm test
npm run codex-plugin:deploy
```

`npm test`는 Workbench의 dev-wiki Node 테스트와 OpenAPI Ruby 테스트를 실행합니다. 배포 manifest는 [`codex-plugin/plugins/workbench/.codex-plugin/plugin.json`](./codex-plugin/plugins/workbench/.codex-plugin/plugin.json), 활성 marketplace 등록은 [`codex-plugin/.agents/plugins/marketplace.json`](./codex-plugin/.agents/plugins/marketplace.json)이 소유합니다.

## Legacy 정책

`legacy/`는 현재 runtime, marketplace, CI, 테스트의 입력이 아닙니다. `legacy/codex-planning-stack/dev-wiki/source/`와 `plan-wiki/source/`는 각 원격 저장소를 유지하는 별도 Git clone이며 root repository에서는 ignore합니다.
