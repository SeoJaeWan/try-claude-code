# Dev CLI Core Mind Map

## 목적

`packages/dev-cli/src/core` 아래 파일이 언제, 어떤 경로로, 어떤 역할로 호출되는지 한 번에 보기 위한 문서다.

- 기준 entrypoint: `packages/dev-cli/src/index.mjs`
- 실제 wrapper bin: `packages/frontend/bin/frontend.mjs`, `packages/backend/bin/backend.mjs`
- 핵심 orchestrator: `packages/dev-cli/src/core/runtime/command-dispatcher.mjs`

## 한눈에 보는 마인드맵

```text
frontend / backend
└─ bin/{alias}.mjs  →  runCli({ manifest })
   └─ src/run-cli.mjs
      └─ core/runtime/command-dispatcher.mjs
         ├─ cli/
         │  ├─ arg-parser.mjs
         │  ├─ output.mjs
         │  └─ error-formatter.mjs
         │
         ├─ runtime/
         │  ├─ manifest-types.mjs
         │  ├─ manifest-loader.mjs
         │  └─ help-builder.mjs
         │
         ├─ execution/
         │  ├─ spec-executor.mjs
         │  ├─ spec-parser.mjs
         │  ├─ spec-normalizer.mjs
         │  ├─ file-generator.mjs
         │  ├─ file-writer.mjs
         │  ├─ render-context.mjs
         │  ├─ template-engine.mjs
         │  ├─ ref-resolver.mjs
         │  └─ command-args-resolver.mjs
         │
         ├─ validation/
         │  ├─ command-validator.mjs
         │  └─ validate-file.mjs
         │
         └─ shared/
            ├─ naming.mjs
            ├─ path-utils.mjs
            ├─ recipe-utils.mjs
            └─ path-patterns.mjs
```

## 명령 기준 흐름

### `--help`

```text
command-dispatcher
└─ parseArgv
   └─ action = help
      ├─ loadManifestDirect
      ├─ buildHelpPayload (summary)
      └─ formatOutput
```

- top-level `frontend --help`와 `backend --help`는 manifest가 있으면 항상 동작한다.
- command-scoped `frontend component --help`는 해당 command의 detail JSON을 반환한다.
- profile, mode, activeProfile 개념이 없다.

### 일반 생성 명령 (`component`, `hook`, `module` 등)

```text
command-dispatcher
└─ parseArgv
   └─ action = execute
      ├─ loadManifestDirect
      ├─ parseCommandSpec
      ├─ executeSpecCommand (spec-executor)
      │  ├─ normalizeSpec
      │  ├─ renderSnippet            (snippet command)
      │  └─ generateFiles            (file command)
      │     ├─ resolveCommandArgs
      │     ├─ buildRenderContext
      │     ├─ renderTemplateFile
      │     └─ validateRequest
      ├─ writeGeneratedFiles         (--apply일 때 실제 write)
      └─ formatOutput
```

- `snippet` 계열은 코드 조각만 반환한다.
- `file` 계열은 파일 plan 또는 실제 파일 write로 이어진다.

### `validate-file`

```text
command-dispatcher
└─ parseArgv
   └─ action = validateFile
      ├─ loadManifestDirect
      ├─ parseValidateFileSpec
      └─ validateFiles
         ├─ 디렉터리 재귀 탐색
         ├─ targetRules로 파일 분류
         ├─ AST 파싱
         ├─ resolveCommandArgs / applyFieldResolvers
         ├─ validateRequest
         └─ 결과 집계
```

- 파일 시스템에 이미 존재하는 파일들을 manifest contract 기준으로 검사하는 전용 경로다.
- AST/ownership/import/path 규칙까지 보므로 core 안에서 가장 무거운 모듈이다.

## 파일별 사용처 정리

### 1. Entry / Routing

| File | 주 호출자 | 언제 사용되나 | 역할 |
| --- | --- | --- | --- |
| `src/index.mjs` | wrapper bin | public entry | `dispatchManifestCli` re-export |
| `src/run-cli.mjs` | wrapper bin | `runCli({ manifest })` 호출 시 | `dispatchManifestCli`로 위임 |
| `runtime/command-dispatcher.mjs` | `run-cli.mjs` | 모든 명령 시작점 | 전체 orchestration, handler 분기, 출력/에러 처리 |
| `cli/arg-parser.mjs` | `command-dispatcher.mjs` | argv를 처음 읽을 때 | `--json`, positional을 구조화하고 첫 command를 camelCase로 정규화 |
| `execution/spec-parser.mjs` | `command-dispatcher.mjs` | `execute`, `validate-file` 진입 시 | `--json` spec, `validate-file <directory>`를 contract 형태로 파싱 |

### 2. Manifest / Help

| File | 주 호출자 | 언제 사용되나 | 역할 |
| --- | --- | --- | --- |
| `runtime/manifest-types.mjs` | `manifest-loader.mjs`, `command-dispatcher.mjs` | manifest 검증 시 | `assertManifest` guard |
| `runtime/manifest-loader.mjs` | `command-dispatcher.mjs` | manifest 로드 시 | `loadManifestDirect` |
| `runtime/help-builder.mjs` | `command-dispatcher.mjs` | `--help`, `command --help` | manifest 기반 summary/detail JSON help payload 생성 |

### 3. Output

| File | 주 호출자 | 언제 사용되나 | 역할 |
| --- | --- | --- | --- |
| `cli/output.mjs` | `command-dispatcher.mjs` | 성공/실패 응답 직전 | JSON 포맷 결정, snippet/file/error를 최종 문자열로 변환 |
| `cli/error-formatter.mjs` | `command-dispatcher.mjs` | 예외 catch 시 | thrown error를 deterministic error payload로 변환 |

### 4. Generate / Template Rendering

| File | 주 호출자 | 언제 사용되나 | 역할 |
| --- | --- | --- | --- |
| `execution/spec-executor.mjs` | `command-dispatcher.mjs` | 일반 생성 명령 | `executeSpecCommand` 중심 실행기 |
| `execution/spec-normalizer.mjs` | `spec-executor.mjs` | execute 시작 직후 | defaults 적용, normalizationRules 실행, snippet rendering 진입 |
| `execution/file-generator.mjs` | `spec-executor.mjs` | file-kind command 실행 시 | render context 구성, template 렌더, 생성 전 validate 수행 |
| `execution/file-writer.mjs` | `command-dispatcher.mjs`, `spec-executor.mjs` | `--apply` 또는 dry-run plan 확정 시 | 중복 path 검사, overwrite 검사, 실제 파일 write 또는 planned 결과 생성 |
| `execution/template-engine.mjs` | `file-generator.mjs`, `spec-normalizer.mjs` | 템플릿이 실제 문자열로 렌더될 때 | `{{token}}` 기반 템플릿 렌더 |
| `execution/render-context.mjs` | `file-generator.mjs`, `spec-normalizer.mjs` | 템플릿 렌더 직전 | `propsMembers`, `uiStateName`, `endpointConstantName` 같은 context token 계산 |

### 5. Validation / Arg Resolution

| File | 주 호출자 | 언제 사용되나 | 역할 |
| --- | --- | --- | --- |
| `validation/command-validator.mjs` | `command-dispatcher.mjs`, `file-generator.mjs`, `validate-file.mjs` | `validate`, 생성 전 검증, `validate-file` 후속 검증 | manifest validatorRules를 실제 args/files에 적용 |
| `execution/command-args-resolver.mjs` | `file-generator.mjs`, `command-validator.mjs`, `validate-file.mjs` | fieldResolver가 필요한 모든 경로 | detector/template/capture 기반으로 빠진 필드 보정 |
| `validation/validate-file.mjs` | `command-dispatcher.mjs` | `validate-file` | 디렉터리 스캔, targetRules 판정, AST 검사, 결과 집계 |

### 6. Path / Naming / Recipe Utility

| File | 주 호출자 | 언제 사용되나 | 역할 |
| --- | --- | --- | --- |
| `shared/path-utils.mjs` | `command-dispatcher.mjs`, `file-generator.mjs`, `command-validator.mjs`, `validate-file.mjs`, `path-patterns.mjs`, `recipe-utils.mjs` | 거의 모든 경로 처리 | project root 탐색, CLI relative path 정규화, segment 검사 |
| `shared/path-patterns.mjs` | `command-args-resolver.mjs`, `command-validator.mjs`, `validate-file.mjs` | path capture/pattern match가 필요할 때 | `{domain}` 같은 path pattern match와 template 렌더 |
| `shared/recipe-utils.mjs` | core 전반 | 대부분의 normalization/validation 경로 | 공통 error 생성, nested field 조작, case transform helper |
| `shared/naming.mjs` | `recipe-utils.mjs`, `render-context.mjs` | case transform이 필요할 때 | PascalCase / camelCase / kebab-case 변환 |

## 읽는 순서 추천

### 1. 런타임 전체를 먼저 볼 때

1. `runtime/command-dispatcher.mjs`
2. `cli/arg-parser.mjs`
3. `runtime/manifest-types.mjs`
4. `cli/output.mjs`

### 2. manifest 구조를 볼 때

1. `runtime/manifest-types.mjs`
2. `runtime/manifest-loader.mjs`
3. `runtime/help-builder.mjs`
4. `packages/frontend/src/manifest.mjs` (실제 manifest 예시)

### 3. 생성 명령이 어떻게 파일이 되는지 볼 때

1. `execution/spec-parser.mjs`
2. `execution/spec-normalizer.mjs`
3. `execution/file-generator.mjs`
4. `execution/command-args-resolver.mjs`
5. `execution/render-context.mjs`
6. `execution/template-engine.mjs`
7. `validation/command-validator.mjs`
8. `execution/file-writer.mjs`

### 4. validate-file가 왜 큰지 볼 때

1. `runtime/command-dispatcher.mjs`
2. `validation/validate-file.mjs`
3. `execution/command-args-resolver.mjs`
4. `validation/command-validator.mjs`
5. `shared/path-patterns.mjs`
6. `shared/path-utils.mjs`

## 메모

- `runtime/command-dispatcher.mjs`가 거의 모든 core 파일의 진입점이다.
- profile system, mode, remote fetch, global config(`~/.try-claude-dev-cli.json`)는 제거됐다.
- manifest는 각 wrapper package(`packages/frontend`, `packages/backend`)가 소유한다.
- `command-validator.mjs`와 `validate-file.mjs`가 실제 contract enforcement를 담당한다.
- `recipe-utils.mjs`, `path-utils.mjs`, `path-patterns.mjs`는 leaf utility처럼 보이지만 호출 빈도가 높아서 영향 범위가 넓다.
