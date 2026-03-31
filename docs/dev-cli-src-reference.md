# Dev CLI `src` Reference

이 문서는 `packages/dev-cli/src` 아래의 모든 소스 파일을 현재 구조 기준으로 정리한 참조 문서다.
대상 범위는 public entrypoint, `core` 하위 런타임, 그리고 alias-specific helper를 포함한다.

## Scope

- 기준 경로: `packages/dev-cli/src`
- 현재 canonical alias: `frontend`, `backend`
- 현재 구조 성격:
  - `dev-cli-core`가 CLI transport, manifest loading, generation, validation, help rendering을 소유한다.
  - `packages/frontend`, `packages/backend`는 자신의 `manifest.mjs`를 소유하는 thin wrapper다.
  - alias별 차이는 각 package의 `src/manifest.mjs`와 `src/templates/`에서 표현된다.

## Runtime Flow

1. wrapper package가 `runCli({ manifest })` 를 호출한다.
2. `command-dispatcher`가 `argv`를 파싱하고 action을 결정한다.
3. `--help`이면 `help-builder`가 manifest 기반 JSON help payload를 만든다.
4. 일반 command이면 manifest의 recipe를 읽어 `execution` 계층으로 전달한다.
5. 실행 경로에서는 `spec-normalizer` -> `command-args-resolver` -> `render-context` -> `template-engine` -> `file-generator` 순서로 파일 또는 snippet이 생성된다.
6. `command-validator`가 command 단위 규칙을 검사하고, `validate-file`은 파일 시스템 기준 정적 검사를 수행한다.
7. `output`이 JSON을 렌더링하고, `error-formatter`가 실패를 안정적인 error envelope로 바꾼다.

## Directory Map

| 경로 | 의미 |
| --- | --- |
| `src/index.mjs` | public entry — `dispatchManifestCli` re-export |
| `src/run-cli.mjs` | `runCli()` wrapper |
| `src/core/runtime/*` | manifest types, loader, dispatcher, help-builder |
| `src/core/cli/*` | CLI parsing, output formatting |
| `src/core/execution/*` | spec normalization, rendering, file generation |
| `src/core/validation/*` | command-level validation, directory/file-level validation |
| `src/core/shared/*` | naming/path/pattern/error/default utility |
| `src/validators/*` | 특정 alias가 재사용하는 helper |

## File Reference

### Public Entry

| 파일 | 주요 역할 | 사용 목적 | 주요 의존성 |
| --- | --- | --- | --- |
| `src/index.mjs` | public API entry | `dispatchManifestCli`를 re-export한다. 외부 패키지는 이 entry를 통해 core API에 접근한다. | `src/core/runtime/command-dispatcher.mjs` |
| `src/run-cli.mjs` | `runCli()` shim | `runCli({ manifest, argv, cwd })` 형태로 호출을 받아 `dispatchManifestCli`로 위임한다. | `src/core/runtime/command-dispatcher.mjs` |

### Runtime Layer (`src/core/runtime/`)

| 파일 | 주요 역할 | 사용 목적 | 주요 의존성 |
| --- | --- | --- | --- |
| `manifest-types.mjs` | CliManifest type + guard | `assertManifest`로 manifest shape를 검증한다. 잘못된 manifest는 `INVALID_MANIFEST` 오류를 던진다. | 없음 |
| `manifest-loader.mjs` | manifest loader | `loadManifestDirect(manifest)`로 manifest를 검증하고 반환한다. | `manifest-types.mjs` |
| `help-builder.mjs` | help payload builder | `buildHelpPayload`, `buildSummaryHelp`, `buildDetailHelp`로 manifest 기반 help JSON을 만든다. profile/activeProfile 의존성이 없다. | 없음 |
| `command-dispatcher.mjs` | manifest-only CLI dispatcher | `dispatchManifestCli({ manifest, argv, stdout, stderr })`가 전체 CLI 흐름을 처리한다. `--help`, command execution, error handling까지 포함한다. | `cli/*`, `execution/*`, `shared/*`, `validation/*`, `runtime/*` |

### CLI Layer (`src/core/cli/`)

| 파일 | 주요 역할 | 사용 목적 | 주요 의존성 |
| --- | --- | --- | --- |
| `arg-parser.mjs` | raw argv 파싱 | `--json`, 옵션과 positional command를 분리한다. 첫 command를 camelCase로 바꿔 내부 command key와 맞춘다. | 없음 |
| `error-formatter.mjs` | error envelope 생성 | 예외를 `{ ok: false, error: { code, message, details } }` 구조로 바꾼다. CLI contract를 deterministic하게 유지하는 목적이다. | 없음 |
| `output.mjs` | final output renderer | payload를 JSON으로 바꾼다. snippet이면 code만, file generation이면 path 목록만, error면 사람이 읽기 쉬운 text를 출력한다. | 없음 |

### Execution Layer (`src/core/execution/`)

| 파일 | 주요 역할 | 사용 목적 | 주요 의존성 |
| --- | --- | --- | --- |
| `batch-executor.mjs` | execution coordinator | 단일 command 실행을 조정한다. `executeSpecCommand`이 중심이다. | `file-generator.mjs`, `file-writer.mjs`, `spec-normalizer.mjs` |
| `command-args-resolver.mjs` | derived arg resolver | command의 `fieldResolvers`를 실행해 누락된 field를 채운다. path capture, file name, parent segment, prefix map, detector 기반 필드 유도에 사용된다. | `path-utils.mjs`, `recipe-utils.mjs`, `path-patterns.mjs`, `validators/backend-utils.mjs` |
| `file-generator.mjs` | file plan generator | command spec를 파일 목록으로 변환한다. 템플릿 선택, render context 생성, output path 계산, pre-write validation까지 수행한다. | `template-engine.mjs`, `render-context.mjs`, `command-validator.mjs`, `command-args-resolver.mjs` |
| `file-writer.mjs` | write/dry-run executor | generated files를 실제 파일 시스템에 쓰거나, dry-run이면 `planned` 상태로만 반환한다. duplicate path와 overwrite protection도 여기서 처리한다. | Node fs/path |
| `ref-resolver.mjs` | `$ref` resolver | spec 내부의 backward reference를 해석한다. unknown ref, forward ref, missing path를 명시적으로 실패시킨다. | 없음 |
| `render-context.mjs` | template token builder | template에서 쓰는 token 값을 계산한다. React, hook, query, endpoint, mapper, Java DTO/entity용 context token이 모두 여기서 만들어진다. | `naming.mjs`, `recipe-utils.mjs` |
| `spec-normalizer.mjs` | spec normalization engine | 입력 schema 검증, naming/path normalization, derived field 계산, snippet rendering 전 단계 정리를 수행한다. 현재 command semantics가 가장 많이 응축된 파일이다. | `render-context.mjs`, `template-engine.mjs`, `recipe-utils.mjs` |
| `spec-parser.mjs` | JSON-only spec parser | command, validate-file가 JSON 또는 positional을 어떤 식으로 받아야 하는지 강제한다. `JSON_SPEC_REQUIRED` 같은 contract error가 여기서 나온다. | `arg-parser.mjs` |
| `template-engine.mjs` | tiny template runtime | 파일 또는 inline template content에서 `{{token}}` 치환을 수행한다. | `recipe-utils.mjs`, Node fs |

`src/core/execution/spec-normalizer.mjs`의 핵심 책임은 아래와 같다.

- 입력 schema 강제:
  - `required`, `requiredAny`, `arrays`, `enums` 검사
- normalization rule 실행:
  - case 변환
  - path 정규화
  - prefix 강제
  - intent 기반 이름 생성
  - members/list/string list 정규화
  - uppercase 변환
  - derive rule 계산
- snippet command 실행:
  - file generation이 아닌 command는 여기서 바로 template를 렌더링해 result snippet을 만든다.

`src/core/execution/render-context.mjs`는 alias/domain-specific한 흔적이 많다.

- React/UI 계열:
  - `propsMembers`
  - `uiStateName`
  - `queryKeyFunctionName`
  - `endpointConstantName`
  - `mapperName`
- Java/backend 계열:
  - `recordFields`
  - `entityFields`
  - `featurePackage`
  - `basePackagePath`

즉 현재는 pure transport core라기보다, command/domain 표현도 상당 부분 이 계층이 소유한다.

### Validation Layer (`src/core/validation/`)

| 파일 | 주요 역할 | 사용 목적 | 주요 의존성 |
| --- | --- | --- | --- |
| `command-validator.mjs` | command-level validator | manifest command에 정의된 validator rule을 실행한다. path roots, segment case, path pattern, name case/prefix, field pattern, conditional allowed values, forbidden content를 검증한다. | `path-utils.mjs`, `command-args-resolver.mjs`, `recipe-utils.mjs`, `path-patterns.mjs` |
| `validate-file.mjs` | file-system level validator | 디렉터리를 재귀 스캔해 어떤 command contract에 해당하는 파일인지 추론하고, AST 구조, path 규칙, default export, forbidden pattern, import ownership까지 검사한다. 현재 가장 크고 복잡한 분석 모듈이다. | `@babel/parser`, `path-utils.mjs`, `path-patterns.mjs`, `command-args-resolver.mjs`, `command-validator.mjs`, Node fs/path |

`src/core/validation/command-validator.mjs`의 사용 목적은 "생성 직전 또는 단일 파일 검증"이다.

- 생성 전 spec/args 수준의 규칙 검사
- 생성된 file content에 forbidden pattern이 있는지 검사
- `validate-file`에서도 공통 command rule 재사용

`src/core/validation/validate-file.mjs`의 사용 목적은 "생성 후 repo 실제 파일을 계약 기준으로 다시 검증"하는 것이다.

- target inference:
  - 어떤 파일이 component인지 hook인지 apiHook인지 `targetRules`로 추론한다.
- AST 구조 검사:
  - named default export 여부
  - arrow function entry 여부
  - props type 존재 여부
  - subcomponent/helper/hook 구조 위반 여부
- path 검사:
  - 허용 root
  - segment case
  - file name style
  - pattern match
- content 검사:
  - forbidden pattern
- import ownership 검사:
  - parent-only child component가 바깥 트리에서 재사용되는지 확인
- discovery UX:
  - 지원하지 않는 디렉터리에 대해 example directory와 suggestion을 포함한 에러를 만든다.

현재 구조에서 가장 domain-coupled한 로직은 이 파일에 몰려 있다.

### Shared Utilities (`src/core/shared/`)

| 파일 | 주요 역할 | 사용 목적 | 주요 의존성 |
| --- | --- | --- | --- |
| `naming.mjs` | case conversion | PascalCase, camelCase 변환을 제공한다. normalization과 render context 계산에서 재사용된다. | 없음 |
| `path-utils.mjs` | path normalization | project root 탐색, CLI path 정규화, path segment style 검사, relative path 판단을 담당한다. | Node fs/path |
| `path-patterns.mjs` | path pattern engine | `components/{domain}/{component}` 같은 CLI path 패턴을 매칭하고 capture를 추출한다. suggestion template에도 재사용된다. | `path-utils.mjs` |
| `recipe-utils.mjs` | common runtime helpers | typed CLI error 생성, nested field get/set, defaults merge, case transform, normalization logging을 담당한다. 거의 모든 core 서브 모듈이 이 파일을 사용한다. | `naming.mjs`, `path-utils.mjs` |

### Alias-Specific Helper (`src/validators/`)

| 파일 | 주요 역할 | 사용 목적 | 주요 의존성 |
| --- | --- | --- | --- |
| `src/validators/backend-utils.mjs` | Spring base package detector | `src/main/java/**/*Application.java`를 찾아 package 선언을 읽어 Spring root package를 감지한다. backend field resolver가 `basePackage`를 자동 채우기 위해 사용한다. | Node fs/path |

## Current Ownership Notes

현재 `packages/dev-cli/src`는 계층상 아래 세 역할을 동시에 갖고 있다.

- transport/core 역할:
  - argv parse
  - route
  - output/error format
- execution engine 역할:
  - spec parse
  - normalization
  - template render
  - file write
- contract/domain 역할:
  - UI/backend token 계산
  - Spring base package detection
  - validate-file AST/ownership/path contract

즉 지금의 `dev-cli-core`는 "얇은 공통 runtime"이라기보다 "공통 runtime + command execution kernel + 일부 alias-specific semantics"를 함께 가진 구조다.

## Hotspots

리팩터링 논의가 필요할 때 가장 먼저 봐야 하는 파일은 아래 다섯 개다.

| 파일 | 이유 |
| --- | --- |
| `src/core/runtime/command-dispatcher.mjs` | 전체 orchestration의 진입점이자 의존 방향이 가장 많이 모이는 곳이다. |
| `src/core/execution/spec-normalizer.mjs` | command semantics가 가장 많이 코딩된 곳이다. |
| `src/core/execution/render-context.mjs` | 현재 frontend/backend 표현 로직이 많이 스며 있는 곳이다. |
| `src/core/validation/validate-file.mjs` | 생성 후 규칙 강제를 가장 강하게 수행하는 파일이며 결합도도 가장 높다. |
| `src/core/runtime/help-builder.mjs` | manifest-only help 계약의 기준점이다. |

## Reading Order

처음 읽을 때는 아래 순서를 추천한다.

1. `src/core/runtime/command-dispatcher.mjs`
2. `src/core/cli/arg-parser.mjs`
3. `src/core/runtime/manifest-types.mjs`
4. `src/core/runtime/help-builder.mjs`
5. `src/core/execution/spec-parser.mjs`
6. `src/core/execution/spec-normalizer.mjs`
7. `src/core/execution/file-generator.mjs`
8. `src/core/validation/command-validator.mjs`
9. `src/core/validation/validate-file.mjs`

이 순서로 읽으면 현재 구조가 "입력 -> manifest -> 실행 -> 검증 -> 출력"으로 어떻게 이어지는지 가장 빠르게 파악할 수 있다.
