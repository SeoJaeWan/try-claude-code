# Current Architecture — Codex Workbench

> 기준일: 2026-07-16

이 문서는 저장소의 현재 기준점을 설명한다. 사용자-facing 제품은 Codex Workbench 플러그인에 두고, Workbench 성능 평가는 project-local `.codex` skill로 분리한다. Claude Code 플러그인과 과거 project-local Codex planning stack은 `legacy/`에 격리한다.

## 현재 기준점

| 영역 | 경로 | 역할 |
|---|---|---|
| Codex 메인 플러그인 | `codex-plugin/plugins/workbench/` | 근거 정리, 목표·완료 조건 대화, Goal Contract 실행, 선택적 검증, dev wiki 컨텍스트와 유지보수 |
| Project-local 평가 스킬 | `.codex/skills/evaluate-workbench/` | Workbench target의 목표 대화·Goal Contract·동일 세션 구현 결과를 격리 비교하고 executor-only 구현 성능을 진단 |
| Project-local Codex 설정 | `.codex/config.toml` | Workbench 평가용 동시 agent thread 한도를 이 저장소에서만 20으로 확장 |
| Codex marketplace | `codex-plugin/.agents/plugins/marketplace.json` | Workbench 로컬 marketplace 등록 |
| 배포 도구 | `codex-plugin/scripts/deploy-workbench-plugin.mjs` | Workbench manifest와 cachebuster 기반 배포 |
| Codex 지침 경계 | `.codex/AGENTS.md` | evaluator 외 project-local stack이 다시 생기지 않도록 보호 |
| 활성 CI | `.github/workflows/workbench-test.yml` | Workbench와 project-local evaluator 테스트 |
| 현재 문서 | `docs/current-architecture.md` | 현재 구조의 canonical 문서 |
| 역사 보관 | `legacy/old/` | Claude Code 플러그인, Codex planning stack, fable5, 과거 plan·CI·문서 |
| v1 보존본 | `legacy/v1/workbench/` | 현재 Workbench를 개선 전 상태로 보존한 snapshot |

## 루트 구조

```text
.
├── .agent/
├── .claude/
├── .codex/
│   ├── AGENTS.md
│   ├── config.toml
│   └── skills/
│       └── evaluate-workbench/
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
│   │   └── dev-wiki/
│   └── tools/
└── scripts/deploy-workbench-plugin.mjs
```

Workbench의 기본 역할은 plugin manifest의 default prompt와 각 `SKILL.md`가 소유한다. 배포되는 Workbench 스킬을 추가하거나 수정할 때는 `codex-plugin/plugins/workbench/`를 기준으로 판단한다. `evaluate-workbench`는 배포 대상이 아니며 `.codex/skills/evaluate-workbench/`가 별도로 소유한다.

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

## Workbench 결과 벤치마크

`.codex/skills/evaluate-workbench/`는 위 목표 중심 작업 흐름이나 Workbench 플러그인에 포함되는 단계가 아니라, Workbench 버전이나 구성이 불완전한 사용자 목표를 합의 가능한 Goal Contract로 만들고 같은 세션에서 얼마나 안정적으로 구현하는지 비교하는 project-local 평가 스킬이다.

- 비교 대상은 `current`, `v1`, `v3` 같은 고정 목록이 아니라 사용자가 지정한 임의의 label과 plugin root다.
- 각 대상은 자기 manifest와 skill metadata에서 고유한 흐름을 발견한다. 공통 skill 이름이나 순서를 전제하지 않는다.
- 기본 `full-loop` 모드는 두 과제의 불완전한 최초 요청에서 시작한다. 숨겨진 scenario가 질문에는 고정 답변을, 올바른 제안에는 고정 확인을, 잘못되거나 누락된 결정에는 고정 반론을 제공한다. 메인 세션은 scenario 밖의 사용자 사실이나 힌트를 만들 수 없다.
- 모든 필수 결정이 사용자 확인 상태가 된 뒤 고정된 최종 정리 요청으로 Goal Contract를 받는다. 계약의 필수 의미 슬롯이 모두 맞을 때만 요구사항을 반복하지 않는 실행 요청을 같은 subagent thread에 전달한다.
- `executor-only` 모드는 기존의 완전한 `profile-cache-dedupe` 로직 과제와 `optimistic-favorite-ui` 프론트엔드 과제를 사용하며 전체 Workbench 성능이 아닌 구현 컴포넌트 진단으로 취급한다.
- 각 반복은 새 workspace와 새 subagent를 사용한다. 모든 workspace와 최초 입력을 먼저 준비한 뒤, 전체 `spawn_agent` 호출을 하나의 병렬 배치로 제출한다. 일부 agent만 시작할 수 있으면 wave 실행으로 전환하지 않고 세션을 무효화한다.
- 각 대화 라운드는 active agent별 병렬 wait branch에서 응답 직후 clock을 멈춘 다음 barrier 뒤에 해석한다. 다음 고정 답변도 한 번의 병렬 follow-up 배치로 전달해 메인 세션의 분류 순서가 latency에 포함되지 않게 한다.
- Oracle과 다른 실행 결과는 대상에 노출하지 않으며, 모든 target clock이 멈춘 뒤에만 검증을 시작한다.
- `full-loop`는 Goal Contract와 최종 artifact가 모두 통과해야 PASS다. 성공률이 같을 때 성공 실행의 사용자 대화 턴 수, 동일 병렬 부하의 target-active latency 순으로 비교한다. `executor-only`는 artifact 성공률과 latency만 비교한다.
- 의미 매핑이 불확실한 실행은 `EVAL_INVALID`, orchestration 문제는 `INFRA_ERROR`로 분리해 성공률 분모에서 제외한다. 관찰 가능한 입력·출력, 선택된 scenario event, 사용 skill 정보는 사람이 실패 원인을 확인하도록 보존한다.
- p90 latency와 최초 dispatch skew는 세션 안정성 신호로 남기며 다른 세션의 절대 속도와 직접 비교하지 않는다.
- 결과는 `<workspace>/output/evaluate/<UTC timestamp>/`에 저장하며 활성 plugin이나 skill cache 내부에는 쓰지 않는다.

## 책임 경계

- `codex-plugin/plugins/workbench/`는 현재 제품의 사용자-facing 스킬과 runtime 구현을 소유한다.
- `.codex/skills/evaluate-workbench/`는 Workbench 배포물과 독립된 개발용 평가 prompt, fixture, Oracle, runner를 소유한다.
- 메인 Codex 대화는 `spawn_agent`·`wait_agent`·`send_input`·`close_agent`로 benchmark subagent의 생명주기를 직접 관리한다. Node runner의 `spawnSync`는 fixture setup, Git, 테스트 같은 로컬 프로세스 전용이며 subagent를 만들지 않는다.
- `brainstorm`과 `executor`는 프로젝트 dev wiki가 해석되면 별도 요청 없이 관련 문서를 읽는다.
- `dev-wiki` 스킬 자체는 setup, audit, update, lint, graph 같은 wiki 관리 요청을 담당한다.
- `evaluate-workbench`는 격리된 fixture만 변경하며 사용자의 실제 application workspace를 평가 대상으로 수정하지 않는다.
- `.codex/`에는 `AGENTS.md`, 평가용 `config.toml`, `skills/evaluate-workbench/`만 둔다. 다른 project-local skills, tools, artifacts, config, wiki clone을 추가하지 않는다.
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
| 과거 `.codex/{config.toml,artifacts,skills,tools}` planning stack | `legacy/old/codex-planning-stack/` |
| `.codex/{dev-wiki,plan-wiki}` | `legacy/old/codex-planning-stack/` |
| `docs/plan-wiki-docs.md` | `legacy/old/codex-planning-stack/docs/plan-wiki-docs.md` |
| 역사 문서 | `legacy/old/docs/` |
| 현재 Workbench snapshot | `legacy/v1/workbench/` |
| 활성에서 제거한 fable5 | `legacy/old/fable5/` |

`legacy/old/codex-planning-stack/dev-wiki/source/`와 `legacy/old/codex-planning-stack/plan-wiki/source/`는 별도 Git 경계를 유지하고 root repository에서는 ignore한다.

## 검증 기준

- `.codex/`에는 `AGENTS.md`, `config.toml`, `skills/evaluate-workbench/`만 존재해야 한다.
- `npm test`는 Workbench dev-wiki·OpenAPI와 project-local evaluate-workbench 러너 테스트를 실행한다.
- `.github/workflows/workbench-test.yml`은 루트 `npm test`와 같은 활성 테스트 경계를 사용한다.
- 활성 package와 CI는 `.codex/skills/evaluate-workbench`만 project-local skill 실행 경로로 참조할 수 있으며 `.codex/tools`, `.codex/dev-wiki`, `.codex/plan-wiki`는 참조하지 않는다.
