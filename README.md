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
│   ├── config.toml                 # 프로젝트 agent thread 한도
│   └── skills/evaluate-workbench/  # project-local Workbench 성능 벤치마크
├── .github/                        # Workbench CI
├── codex-plugin/                   # 메인 제품
├── docs/
│   └── current-architecture.md     # 현재 구조의 canonical 문서
├── legacy/
│   ├── old/                        # 과거 플러그인·planning stack·제거된 Workbench 스킬
│   └── v1/workbench/               # 현재 Workbench의 보존본
├── README.md
├── package.json
└── .gitignore
```

## Codex Workbench

| 스킬 | 역할 |
|---|---|
| `$workbench:issue-brief` | Jira·Figma·QA·API·사용자 입력을 근거 중심으로 정리 |
| `$workbench:brainstorm` | 목표·완료 조건을 사용자와 토론하고 Goal Contract로 정리 |
| `$workbench:executor` | 명시된 Goal Contract를 dev wiki와 함께 실행 |
| `$workbench:visual-grounding` | Figma·원본 UI·스크린샷과 local 구현 비교 |
| `$workbench:openapi` | Swagger/OpenAPI 서비스와 endpoint 탐색·검증 |
| `$workbench:dev-wiki` | 중앙 Workbench dev wiki의 setup, audit, update, lint, graph 유지; brainstorm/executor의 자동 컨텍스트 |
| `$workbench:llm-script` | 현재 workspace를 중앙 수집 저장소에 명시적으로 등록하고 script-source 수집 상태 확인 |

모든 Workbench 스킬은 명시 호출 전용입니다. 일반 자연어 요청만으로 스킬을 자동 선택하거나 다른 Workbench 스킬로 자동 전환하지 않습니다. 사용자는 필요한 지점에 `$workbench:<skill>`을 지정하며, Goal Contract 뒤의 실행도 별도의 `$workbench:executor` 호출로 시작합니다. 지원 기능도 각각 독립적으로 호출할 수 있습니다. brainstorm과 executor가 기존 dev wiki를 컨텍스트로 읽는 것은 `$workbench:dev-wiki` 유지보수 스킬의 자동 호출을 뜻하지 않습니다. `$workbench:llm-script`도 setup과 status에만 명시적으로 호출하며, setup으로 등록한 workspace에서는 이후 `PostToolUse` hook이 별도 스킬 호출 없이 실행된 script source를 자동 수집합니다.

테스트 작성과 수정은 다른 코드·문서·스크립트와 동일한 작업 산출물입니다. 사용자가 Goal Contract나 직접 요청에 포함했을 때만 실행 범위가 되며, 기존 테스트를 실행하는 검증 행위 자체는 새로운 테스트 산출물을 만드는 권한이 아닙니다.

```text
$workbench:issue-brief (선택) ─────┐
                                  ↓
사용자 명시 호출 ─────→ $workbench:brainstorm
                                  │  + 기존 dev wiki 컨텍스트
                                  ↓
                            Goal Contract
                                  ↓ (별도 명시 호출)
                           $workbench:executor
                                  ↓
              필요한 지원 스킬도 각각 명시 호출
```

## LLM script-source 수집

`$workbench:llm-script setup`은 현재 workspace를 중앙 수집 저장소에 등록하고, `$workbench:llm-script status`는 설정·clone·workspace 등록 상태를 확인합니다. 기본 중앙 위치는 `${CODEX_HOME:-~/.codex}/workbench/llm-script/`이며 record는 그 아래 `source/records/YYYY/MM/DD/`에 하나씩 추가됩니다.

setup 이후 Workbench의 `PostToolUse` hook은 Codex가 shell 도구로 실행한 file script, inline code, heredoc 같은 script entrypoint를 탐지해 당시 source snapshot을 JSON record로 저장합니다. 이는 사용 이력 수집용이며 script library가 아닙니다. 실행 이유, prompt·transcript·session, hook process 환경 값, stdout·stderr·결과, imported dependency source, 집계·후보·catalog는 별도로 저장하지 않습니다. source 자체에 포함된 비민감 환경 할당은 코드의 일부로 보존합니다. workspace 밖의 파일, `.git`, `node_modules`, vendor, 비밀정보 파일, binary, 크기 제한을 넘는 source는 제외하고, hook은 clone에 `pull`, `add`, `commit`, `push`를 수행하지 않습니다.

hook은 best-effort 수집 장치이므로 모든 실행을 완전하게 기록한다고 보장하지 않습니다. `PostToolUse` payload가 `exec_command`의 별도 workdir를 전달하지 않으므로 file source는 세션 cwd 기준 상대·절대 경로나 command에 명시된 static `cd`까지만 정확히 복원하며, 실행 후 삭제·변경된 파일은 건너뛸 수 있습니다. inline·heredoc source는 command 원문에서 수집합니다. 플러그인을 설치·갱신한 뒤 `/hooks`에서 Workbench hook의 command와 matcher를 검토하고 trust 상태를 확인해야 합니다.

## Project-local Workbench 벤치마크

`.codex/skills/evaluate-workbench/`는 Workbench 플러그인에 포함되지 않는 이 저장소 전용 평가 스킬입니다. 기본 `full-loop` 모드는 `$workbench:brainstorm`을 명시한 불완전한 요청에서 시작해 고정된 숨은 사용자 상태로 목표를 대화하고, Goal Contract가 합의된 뒤 같은 subagent 세션에 `$workbench:executor`를 명시해 구현까지 이어지는 전체 결과를 비교합니다. 메인 세션은 답변을 임의로 만들지 않고 시나리오의 고정 답변·확인·반론만 전달합니다. Goal Contract와 최종 artifact가 모두 통과해야 성공이며, 성공률이 같으면 성공 실행의 사용자 대화 턴 수와 같은 병렬 부하의 latency 순으로 비교합니다. 기존의 명확한 로직·프론트엔드 구현 과제는 `executor-only` 컴포넌트 진단으로 남습니다. 실행 기록은 `<workspace>/output/evaluate/`에 남으며 Git에는 포함하지 않습니다.

명시 selector는 target 경로만으로 재바인딩되지 않습니다. 서로 다른 Workbench 버전을 비교하려면 각 target agent 환경의 `$workbench` 설치본도 해당 버전으로 격리되어야 하며, 같은 namespace의 버전을 독립 설치할 수 없으면 버전 간 결과를 유효하다고 보고하지 않습니다.

## 실행

```bash
npm test
npm run codex-plugin:deploy
```

`npm test`는 Workbench의 dev-wiki·llm-script Node 테스트, OpenAPI Ruby 테스트와 project-local evaluate-workbench 러너 테스트를 실행합니다. 배포 manifest는 [`codex-plugin/plugins/workbench/.codex-plugin/plugin.json`](./codex-plugin/plugins/workbench/.codex-plugin/plugin.json), 활성 marketplace 등록은 [`codex-plugin/.agents/plugins/marketplace.json`](./codex-plugin/.agents/plugins/marketplace.json)이 소유합니다.

## Legacy 정책

`legacy/`는 현재 runtime, marketplace, CI, 테스트의 입력이 아닙니다. 활성 Workbench에서 제거한 최신 `test-brief` 계약은 `legacy/old/workbench-skills/test-brief/`에 보존합니다. `legacy/old/codex-planning-stack/dev-wiki/source/`와 `legacy/old/codex-planning-stack/plan-wiki/source/`는 각 원격 저장소를 유지하는 별도 Git clone이며 root repository에서는 ignore합니다.
