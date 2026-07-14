# Current Architecture — Codex Workbench

> 기준일: 2026-07-14

이 문서는 저장소의 현재 기준점을 설명한다. 사용자-facing 제품과 활성 CI는 Codex Workbench를 중심으로 구성하고, Claude Code 플러그인과 project-local Codex planning stack은 `legacy/`에 격리한다.

## 현재 기준점

| 영역 | 경로 | 역할 |
|---|---|---|
| Codex 메인 플러그인 | `codex-plugin/plugins/workbench/` | 근거 정리, 목표·완료 조건 대화, Goal Contract 실행, 선택적 검증, dev wiki 컨텍스트와 유지보수 |
| Codex marketplace | `codex-plugin/.agents/plugins/marketplace.json` | Workbench 로컬 marketplace 등록 |
| 배포 도구 | `codex-plugin/scripts/deploy-workbench-plugin.mjs` | Workbench manifest와 cachebuster 기반 배포 |
| Codex 지침 경계 | `.codex/AGENTS.md` | `.codex/`에 project-local stack이 다시 생기지 않도록 보호 |
| 활성 CI | `.github/workflows/workbench-test.yml` | Workbench Node·Ruby 테스트 |
| 현재 문서 | `docs/current-architecture.md` | 현재 구조의 canonical 문서 |
| 역사 보관 | `legacy/old/` | Claude Code 플러그인, Codex planning stack, fable5, 과거 plan·CI·문서 |
| v1 보존본 | `legacy/v1/workbench/` | 현재 Workbench를 개선 전 상태로 보존한 snapshot |

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
│   ├── old/
│   │   ├── claude-code/
│   │   ├── codex-planning-stack/
│   │   ├── docs/
│   │   └── fable5/
│   └── v1/workbench/
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
│   └── tools/
└── scripts/deploy-workbench-plugin.mjs
```

Workbench의 기본 역할은 plugin manifest의 default prompt와 각 `SKILL.md`가 소유한다. 스킬을 추가하거나 수정할 때는 `codex-plugin/plugins/workbench/`를 기준으로 판단한다.

## 목표 중심 작업 흐름

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

`issue-brief`는 정보 정리만으로 종료할 수 있다. `brainstorm`은 직접 시작하거나 중간에 `issue-brief`, `openapi`, `visual-grounding`을 호출해 근거를 추가할 수 있다. 해당 프로젝트의 dev wiki는 `brainstorm`과 `executor`가 자동으로 참고한다. `test-brief`와 `branch-work-report`는 선택적 지원 기능이다. `legacy/old/fable5/`는 더 이상 활성 plugin skill이 아닌 과거 운영 모드의 참고본이다.

## 책임 경계

- `codex-plugin/plugins/workbench/`는 현재 제품의 사용자-facing 스킬과 runtime 구현을 소유한다.
- `brainstorm`과 `executor`는 프로젝트 dev wiki가 해석되면 별도 요청 없이 관련 문서를 읽는다.
- `dev-wiki` 스킬 자체는 setup, audit, update, lint, graph 같은 wiki 관리 요청을 담당한다.
- `.codex/`에는 보호용 `AGENTS.md`만 둔다. project-local skills, tools, artifacts, config, wiki clone을 추가하지 않는다.
- `.agent/`는 Workbench 행동 원칙의 원천이며 자동 지침 진입점이 아니다.
- `.claude/CLAUDE.md`는 `.agent/AGENTS.md`를 import하는 Claude용 얇은 어댑터다.
- `.github/`에는 활성 Workbench CI만 둔다.
- `docs/`에는 현재 기준 문서만 둔다.
- `legacy/`는 보관 영역이다. 활성 manifest, CI, 테스트, 작업 흐름에서 참조하지 않는다.

## Legacy 매핑

| 이전 경로 | 보관 경로 |
|---|---|
| `claude-plugin/` | `legacy/old/claude-code/plugin/` |
| `.claude-plugin/marketplace.json` | `legacy/old/claude-code/marketplace.json` |
| `plans/` | `legacy/old/claude-code/plans/` |
| `.github/workflows/plugin-test.yml` | `legacy/old/claude-code/ci/plugin-test.yml` |
| `.agents/plugins/marketplace.json` | `legacy/old/codex-planning-stack/marketplace.json` |
| `.codex/{config.toml,artifacts,skills,tools}` | `legacy/old/codex-planning-stack/` |
| `.codex/{dev-wiki,plan-wiki}` | `legacy/old/codex-planning-stack/` |
| `docs/plan-wiki-docs.md` | `legacy/old/codex-planning-stack/docs/plan-wiki-docs.md` |
| 역사 문서 | `legacy/old/docs/` |
| 현재 Workbench snapshot | `legacy/v1/workbench/` |
| 활성에서 제거한 fable5 | `legacy/old/fable5/` |

`legacy/old/codex-planning-stack/dev-wiki/source/`와 `legacy/old/codex-planning-stack/plan-wiki/source/`는 별도 Git 경계를 유지하고 root repository에서는 ignore한다.

## 검증 기준

- `.codex/AGENTS.md`가 `.codex/`의 유일한 파일이어야 한다.
- `npm test`는 Workbench dev-wiki와 OpenAPI 테스트를 실행한다.
- `.github/workflows/workbench-test.yml`은 루트 `npm test`와 같은 활성 테스트 경계를 사용한다.
- 활성 package, CI, Workbench 문서는 project-local `.codex/skills`, `.codex/tools`, `.codex/dev-wiki`, `.codex/plan-wiki`를 실행 경로로 참조하지 않는다.
