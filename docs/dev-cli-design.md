# Dev CLI Design

## Summary

`frontend`, `backend`는 `@seojaewan/dev-cli-core` shared runtime 위에서 동작하고, 실제 배포는 `@seojaewan/frontend`, `@seojaewan/backend` wrapper package가 담당한다.
규칙, 템플릿, 명령 표면은 각 패키지가 소유하는 `manifest.mjs`에서 정의하고, CLI는 spec-driven JSON 입력을 기본으로 제공한다.
이때 core runtime은 실행기 역할만 맡고, command semantics는 패키지 내부의 manifest recipe가 소유한다.

이 구조는 agent-first CLI 원칙을 따른다.

- scaffold/snippet 생성 명령은 명시적인 `--json` spec을 사용한다
- validation/help 같은 운영 명령은 contract에 맞는 전용 입력 형태를 사용한다
- 출력 기본값은 JSON
- preview가 기본값이고 실제 write는 `--apply`
- 실패는 deterministic JSON error payload로 반환
- `handle/on/use`, case, snippet shape, validator rule, template context는 manifest recipe가 소유

## Layout

```text
packages/
  dev-cli/
    src/
      core/
        runtime/     manifest types, loader, dispatcher, help-builder
        execution/   spec-normalizer, file-generator, template-engine, file-writer
        validation/  command-validator, validate-file
        shared/      naming, path-utils, recipe-utils, path-patterns
        cli/         arg-parser, output, error-formatter
      validators/
    tests/
  frontend/
    bin/frontend.mjs
    src/
      manifest.mjs     package-owned CliManifest
      templates/       template files
      validators/      validate-file helper
  backend/
    bin/backend.mjs
    src/
      manifest.mjs     package-owned CliManifest
      templates/       template files
```

## Manifest Contract

각 wrapper package는 CliManifest를 소유한다.

- `id`: manifest identifier (e.g. `"frontend/personal/v1"`)
- `alias`: CLI command name (`"frontend"` or `"backend"`)
- `helpSummary`: discovery용 summary와 workflow flows
- `commands`: command 이름 -> recipe object

각 command recipe는 아래를 가진다.

- `description`
- `inputMode`: `"json"` or `"positional"`
- `execution`: `{ kind: "snippet"|"file", language? }`
- `summary`: `{ whenToUse, relatedCommands, flowRefs }`
- `normalizationRules`
- `validatorRules`
- `render`: `{ snippetTemplateContent? }` or `{ templateFile? }` / `{ templateFiles? }`

즉 core는 parser, dispatcher, preview/apply, error envelope를 유지하고, 실제 command 규칙은 manifest recipe를 해석해서 실행한다.

## Alias Surface

`frontend`
- manifest key: `frontend`
- commands: `component`, `uiState`, `hook`, `apiHook`, `type`, `props`, `function`, `queryKey`, `endpoint`, `mapper`, `hookReturn`, `validateFile`

`backend`
- manifest key: `backend`
- commands: `module`, `requestDto`, `responseDto`, `entity`

## Runtime Contract

현재 runtime contract:

- wrapper package가 자신의 `manifest.mjs`를 직접 `runCli({ manifest })` 에 주입한다.
- profile system, remote fetch, global config(`~/.try-claude-dev-cli.json`), mode/version 개념이 없다.
- `--help`는 항상 manifest 기반 summary JSON을 반환한다.
- command-scoped `--help`는 해당 command detail JSON을 반환한다.
- 일반 명령은 manifest에서 직접 실행된다.
- `mode`, `--mode`, `--version`, `--profile` 옵션은 존재하지 않는다.

## Publish Surface

publish 대상은 3개 패키지다.

- `@seojaewan/dev-cli-core`
- `@seojaewan/frontend`
- `@seojaewan/backend`

wrapper는 각각 하나의 `bin`만 노출한다.

- `@seojaewan/frontend` -> `frontend`
- `@seojaewan/backend` -> `backend`

수동 publish 순서:

1. `@seojaewan/dev-cli-core`
2. `@seojaewan/frontend`
3. `@seojaewan/backend`

manifest 변경이 필요할 때는 해당 wrapper package(`frontend` 또는 `backend`)의 `src/manifest.mjs`를 수정하고 패키지를 새 버전으로 배포한다.

## Help Contract

기본 help는 탐색용 summary JSON이다.

```bash
frontend --help
backend --help
```

에이전트가 매 작업마다 top-level `--help`에서 모든 contract를 읽을 필요는 없다.
top-level help는 명령 탐색, whenToUse, relatedCommands, flow discovery만 제공한다.

구조화된 상세 contract가 실제로 필요할 때만 command-scoped JSON help를 읽는다.

```bash
frontend component --help
frontend apiHook --help
backend requestDto --help
```

top-level `frontend --help`, `backend --help`는 command discovery나 전체 contract audit가 필요할 때만 사용한다.

## Execution Model

spec-driven 생성 command는 `--json` spec을 받는다.

```bash
frontend component --json "{\"name\":\"ReviewCard\",\"path\":\"components/common/reviewCard\"}"
frontend hook --json "{\"name\":\"useScroll\",\"path\":\"hooks/utils/common\"}"
backend requestDto --json "{\"name\":\"CreateProductRequest\",\"path\":\"product\",\"basePackage\":\"com.example.app\"}"
```

preview가 기본이며 실제 파일 생성은 `--apply`일 때만 수행한다.

```bash
frontend component --json "{\"name\":\"ReviewCard\",\"path\":\"components/common/reviewCard\"}"
frontend component --json "{\"name\":\"ReviewCard\",\"path\":\"components/common/reviewCard\"}" --apply
```

## Shared Manifest Defaults

`frontend`와 `backend` manifest가 공통으로 적용하는 기본 규칙:

- path segment: `camelCase`
- 함수 스타일: 화살표 함수
- 내부 handler prefix: `handle`
- props callback prefix: `on`
- 배열 이름: 복수형, `List`/`Array` suffix 금지
- shared type path guidance: `types/common`, `types/{domain}`

공통 snippet command:

- `type`
- `props`
- `function`

예시:

```bash
frontend type --json "{\"name\":\"TableColumn\",\"kind\":\"interface\"}"
frontend props --json "{\"members\":[{\"kind\":\"value\",\"name\":\"title\",\"type\":\"string\",\"required\":true}]}"
frontend function --json "{\"kind\":\"internalHandler\",\"name\":\"onClick\"}"
```

## Frontend Component Contract

`frontend component`

- 입력: `name`, `path`, optional `role`, optional `props`
- 출력: `{path}/index.tsx`
- 이름: PascalCase
- path: `components/common/{component}` 또는 `components/{domain}/{component}`
- domain: `app/{domain}/page.tsx`의 root page segment
- path segment: `camelCase`
- 컴포넌트: 화살표 함수
- `export default`
- `Props` 인터페이스 포함
- props 구조분해는 함수 본문 첫 줄

`frontend uiState`

- UI interaction intent를 받아 state + handler snippet 반환
- whitelist 강제 대신 UI state shell을 정규화

component 금지 패턴:

- `useEffect(`
- `fetch(`
- `axios.`
- `useQuery(`
- `useMutation(`

예시:

```bash
frontend component --json "{\"name\":\"ReviewCard\",\"path\":\"components/common/reviewCard\",\"props\":[{\"kind\":\"value\",\"name\":\"title\",\"type\":\"string\",\"required\":true}]}"
frontend uiState --json "{\"category\":\"uiInteraction\",\"pattern\":\"toggle\",\"name\":\"menu\"}"
```

## Frontend Hook Contract

`frontend hook`

- 입력: `name`, `path`
- 출력: `{path}/{name}/index.ts`
- hook prefix는 manifest recipe 기준으로 `use`
- 화살표 함수
- `export default`

`frontend apiHook`

- 입력: `name`, `path`, `kind`
- TanStack Query baseline
- `queries|mutations` 경로 규칙 강제

snippet command:

- `type`
- `props`
- `function`
- `queryKey`
- `endpoint`
- `mapper`
- `hookReturn`

예시:

```bash
frontend hook --json "{\"name\":\"useScroll\",\"path\":\"hooks/utils\"}"
frontend apiHook --json "{\"name\":\"useGetProduct\",\"path\":\"hooks/apis/product/queries\",\"kind\":\"query\"}"
frontend queryKey --json "{\"domain\":\"product\",\"scope\":\"detail\",\"params\":[\"productId\"]}"
frontend endpoint --json "{\"method\":\"GET\",\"resource\":\"product\",\"path\":\"/products/:productId\"}"
```

## Backend Personal v1

`backend` personal v1은 Spring Boot baseline이다.

source-backed defaults:

- default package 회피
- application class는 root package 하위에 둠
- request validation은 `@Valid`
- REST error baseline은 `@ControllerAdvice`

v1 choices:

- package-by-feature
- path segment는 lower-case
- feature 내부 구조:
  - `controller`
  - `service`
  - `dto`
  - `entity`
  - `repository`

예시:

```bash
backend module --json "{\"name\":\"Product\",\"path\":\"product\",\"basePackage\":\"com.example.app\"}"
backend requestDto --json "{\"name\":\"CreateProductRequest\",\"path\":\"product\",\"basePackage\":\"com.example.app\",\"fields\":[{\"name\":\"name\",\"type\":\"String\",\"validations\":[\"NotBlank\"]}]}"
backend responseDto --json "{\"name\":\"ProductResponse\",\"path\":\"product\",\"basePackage\":\"com.example.app\"}"
backend entity --json "{\"name\":\"Product\",\"path\":\"product\",\"basePackage\":\"com.example.app\"}"
```

`basePackage`가 없으면 CLI는 Spring root package를 감지하려고 시도하고, 실패하면 명시적 JSON error를 반환한다.

## Success and Error Payloads

성공 응답:

```json
{
  "ok": true,
  "command": "function",
  "normalizedSpec": {
    "kind": "internalHandler",
    "name": "handleClick"
  },
  "normalizations": [
    {
      "field": "name",
      "from": "onClick",
      "to": "handleClick",
      "reason": "internal handlers use handle*"
    }
  ],
  "result": {
    "kind": "snippet",
    "language": "ts",
    "code": "const handleClick = () => {\n};"
  }
}
```

오류 응답:

```json
{
  "ok": false,
  "error": {
    "code": "JSON_SPEC_REQUIRED",
    "message": "Command component requires --json with a valid JSON object.",
    "details": {}
  }
}
```

## Ownership Notes

현재 v1에서는 아래 요소가 모두 manifest recipe 기준으로 동작한다.

- `function`의 internal handler prefix
- `props`의 callback prefix
- `hook`과 `apiHook`의 hook prefix
- `uiState`의 state, setter, handler naming
- `queryKey`, `endpoint`, `mapper`, `hookReturn` snippet shape
- file template context와 validator rule

즉 `frontend/personal/v2`나 다른 manifest에서 prefix, shape, validation이 달라지면 core 수정 없이 해당 패키지의 manifest 변경으로 대응하는 구조다.
