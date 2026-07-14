# Current Architecture — Codex Workbench

> 기준일: 2026-07-14

이 문서는 저장소의 현재 기준점을 설명한다. 사용자-facing 제품과 활성 CI는 Codex Workbench를 중심으로 구성하고, Claude Code 플러그인과 project-local Codex planning stack은 `legacy/`에 격리한다.

## 현재 기준점

| 영역 | 경로 | 역할 |
|---|---|---|
| Codex 메인 플러그인 | `codex-plugin/plugins/workbench/` | 이슈 정리, 작업 단위 검토, 테스트 브리프, 범위가드 실행, UI/API 근거 수집, dev wiki 유지 |
| Codex marketplace | `codex-plugin/.agents/plugins/marketplace.json` | Workbench 로컬 marketplace 등록 |
| 배포 도구 | `codex-plugin/scripts/deploy-workbench-plugin.mjs` | Workbench manifest와 cachebuster 기반 배포 |
| Codex 지침 경계 | `.codex/AGENTS.md` | `.codex/`에 project-local stack이 다시 생기지 않도록 보호 |
| 활성 CI | `.github/workflows/workbench-test.yml` | Workbench Node·Ruby 테스트 |
| 현재 문서 | `docs/current-architecture.md` | 현재 구조의 canonical 문서 |
| 역사 보관 | `legacy/` | Claude Code 플러그인, Codex planning stack, 과거 plan·CI·문서 |

## 루트 구조

```text
.
├── .agent/
├── .claude/
├── .codex/
│   └── AGENTS.md
├── .github/
├── codex-plugin/
├── docs/
│   └── current-architecture.md
├── legacy/
│   ├── claude-code/
│   │   ├── plugin/
│   │   ├── marketplace.json
│   │   ├── plans/
│   │   └── ci/
│   ├── codex-planning-stack/
│   │   ├── marketplace.json
│   │   ├── config.toml
│   │   ├── artifacts/
│   │   ├── skills/
│   │   ├── tools/
│   │   ├── dev-wiki/
│   │   ├── plan-wiki/
│   │   └── docs/
│   └── docs/
├── AGENTS.md
├── README.md
├── package.json
└── .gitignore
```

## Workbench 구조

```text
codex-plugin/
├── .agents/plugins/marketplace.json
├── plugins/workbench/
│   ├── .codex-plugin/plugin.json
│   ├── AGENTS.md
│   ├── skills/
│   │   ├── issue-brief/
│   │   ├── brainstorm/
│   │   ├── test-brief/
│   │   ├── executor/
│   │   ├── branch-work-report/
│   │   ├── visual-grounding/
│   │   ├── openapi/
│   │   ├── dev-wiki/
│   │   └── fable5/
│   └── tools/
└── scripts/deploy-workbench-plugin.mjs
```

Workbench의 기본 역할은 plugin manifest의 default prompt와 각 `SKILL.md`가 소유한다. 스킬을 추가하거나 수정할 때는 `codex-plugin/plugins/workbench/`를 기준으로 판단한다.

## 기본 작업 흐름

```text
사용자 요청
  → issue-brief
  → brainstorm
  → 필요 시 test-brief
  → executor
  → branch-work-report
```

`visual-grounding`, `openapi`, `dev-wiki`는 선택한 작업의 근거와 유지보수에 필요할 때 결합한다. `fable5`는 사용자가 명시적으로 호출한 경우에만 적용한다.

## 책임 경계

- `codex-plugin/plugins/workbench/`는 현재 제품의 사용자-facing 스킬과 runtime 구현을 소유한다.
- `.codex/`에는 보호용 `AGENTS.md`만 둔다. project-local skills, tools, artifacts, config, wiki clone을 추가하지 않는다.
- `.agent/`는 Workbench 행동 원칙의 원천이며 자동 지침 진입점이 아니다.
- `.claude/CLAUDE.md`는 루트 `AGENTS.md`를 import하는 Claude용 얇은 어댑터다.
- `.github/`에는 활성 Workbench CI만 둔다.
- `docs/`에는 현재 기준 문서만 둔다.
- `legacy/`는 보관 영역이다. 활성 manifest, CI, 테스트, 작업 흐름에서 참조하지 않는다.

## Legacy 매핑

| 이전 경로 | 보관 경로 |
|---|---|
| `claude-plugin/` | `legacy/claude-code/plugin/` |
| `.claude-plugin/marketplace.json` | `legacy/claude-code/marketplace.json` |
| `plans/` | `legacy/claude-code/plans/` |
| `.github/workflows/plugin-test.yml` | `legacy/claude-code/ci/plugin-test.yml` |
| `.agents/plugins/marketplace.json` | `legacy/codex-planning-stack/marketplace.json` |
| `.codex/{config.toml,artifacts,skills,tools}` | `legacy/codex-planning-stack/` |
| `.codex/{dev-wiki,plan-wiki}` | `legacy/codex-planning-stack/` |
| `docs/plan-wiki-docs.md` | `legacy/codex-planning-stack/docs/plan-wiki-docs.md` |
| 역사 문서 | `legacy/docs/` |

`legacy/codex-planning-stack/dev-wiki/source/`와 `plan-wiki/source/`는 별도 Git 경계를 유지하고 root repository에서는 ignore한다.

## 검증 기준

- `.codex/AGENTS.md`가 `.codex/`의 유일한 파일이어야 한다.
- `npm test`는 Workbench dev-wiki와 OpenAPI 테스트를 실행한다.
- `.github/workflows/workbench-test.yml`은 루트 `npm test`와 같은 활성 테스트 경계를 사용한다.
- 활성 package, CI, Workbench 문서는 project-local `.codex/skills`, `.codex/tools`, `.codex/dev-wiki`, `.codex/plan-wiki`를 실행 경로로 참조하지 않는다.
