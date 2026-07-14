# try-Codex

Codex Workbench 플러그인을 개발·검증하는 저장소입니다. 현재 사용자-facing 제품은 [`codex-plugin/plugins/workbench/`](./codex-plugin/plugins/workbench/)이며, 이전 Claude Code 플러그인과 project-local Codex planning stack은 [`legacy/old/`](./legacy/old/)에, 현재 Workbench 기준 snapshot은 [`legacy/v1/workbench/`](./legacy/v1/workbench/)에 보관합니다.

현재 구조와 책임 경계의 기준 문서는 [`docs/current-architecture.md`](./docs/current-architecture.md)입니다.

## 저장소 구조

```text
.
├── .agent/                         # Workbench 행동 원칙 원본
├── .claude/                        # Claude가 이 저장소를 읽을 때의 지침
├── .codex/
│   ├── AGENTS.md                   # .codex 보호 경계
│   └── skills/evaluate-workbench/  # project-local Workbench 성능 벤치마크
├── .github/                        # Workbench CI
├── codex-plugin/                   # 메인 제품
├── docs/
│   └── current-architecture.md     # 현재 구조의 canonical 문서
├── legacy/
│   ├── old/                        # 과거 플러그인·planning stack·fable5
│   └── v1/workbench/               # 현재 Workbench의 보존본
├── README.md
├── package.json
└── .gitignore
```

## Codex Workbench

| 스킬 | 역할 |
|---|---|
| `issue-brief` | Jira·Figma·QA·API·사용자 입력을 근거 중심으로 정리 |
| `brainstorm` | 목표·완료 조건을 사용자와 토론하고 Goal Contract로 정리 |
| `test-brief` | 필요할 때 Goal Contract를 검증 계약으로 변환 |
| `executor` | 명시된 Goal Contract를 dev wiki와 함께 실행 |
| `branch-work-report` | 현재 브랜치의 커밋별 변경과 리뷰 포인트 보고 |
| `visual-grounding` | Figma·원본 UI·스크린샷과 local 구현 비교 |
| `openapi` | Swagger/OpenAPI 서비스와 endpoint 탐색·검증 |
| `dev-wiki` | 중앙 Workbench dev wiki의 setup, audit, update, lint, graph 유지; brainstorm/executor의 자동 컨텍스트 |

고정된 필수 순서는 없습니다. `issue-brief`는 단독으로 끝날 수 있고, 사용자가 목표를 직접 주면 `brainstorm`으로 바로 시작할 수 있습니다. `brainstorm`은 필요할 때 `issue-brief`, `openapi`, `visual-grounding`을 다시 호출해 근거를 추가하고, 목표와 완료 조건이 명확해졌을 때만 Goal Contract를 만듭니다. `executor`는 사용자의 명시적 요청으로만 시작합니다. `test-brief`와 `branch-work-report`는 선택적 지원 기능입니다.

```text
issue-brief (선택) ─────┐
                       ↓
사용자 목표 ───────→ brainstorm ↔ issue/API/UI 근거
                       │          + 자동 dev wiki 컨텍스트
                       ↓
                 Goal Contract
                       ↓ (명시적 요청)
                    executor
                       ↓
             필요 시 test / API / UI 검증
```

## Project-local Workbench 벤치마크

`.codex/skills/evaluate-workbench/`는 Workbench 플러그인에 포함되지 않는 이 저장소 전용 평가 스킬입니다. 비교 대상의 스킬 이름이나 절차를 강제하지 않고, 격리된 로직·프론트엔드 과제의 최종 결과 성공률과 성공한 실행 시간만 비교합니다. 실행 기록은 `<workspace>/output/evaluate/`에 남으며 Git에는 포함하지 않습니다.

## 실행

```bash
npm test
npm run codex-plugin:deploy
```

`npm test`는 Workbench의 dev-wiki Node 테스트, OpenAPI Ruby 테스트와 project-local evaluate-workbench 러너 테스트를 실행합니다. 배포 manifest는 [`codex-plugin/plugins/workbench/.codex-plugin/plugin.json`](./codex-plugin/plugins/workbench/.codex-plugin/plugin.json), 활성 marketplace 등록은 [`codex-plugin/.agents/plugins/marketplace.json`](./codex-plugin/.agents/plugins/marketplace.json)이 소유합니다.

## Legacy 정책

`legacy/`는 현재 runtime, marketplace, CI, 테스트의 입력이 아닙니다. `legacy/old/codex-planning-stack/dev-wiki/source/`와 `legacy/old/codex-planning-stack/plan-wiki/source/`는 각 원격 저장소를 유지하는 별도 Git clone이며 root repository에서는 ignore합니다.
