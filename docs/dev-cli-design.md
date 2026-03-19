# Dev CLI Design

## Summary

`tcp`, `tcf`, `tcb`는 `@seojaewan/dev-cli-core` shared runtime 위에서 동작하고, 실제 배포는 `@seojaewan/tcp`, `@seojaewan/tcf`, `@seojaewan/tcb` wrapper package가 담당한다.
규칙, 템플릿, 명령 표면은 GitHub `SeoJaeWan/try-claude-code`의 `main/profiles/**`에서 읽고, CLI는 spec-driven JSON 입력과 batch 실행을 기본으로 제공한다.
이때 engine은 실행기 역할만 맡고, command semantics는 `profile/version`의 recipe가 소유한다.

이 구조는 agent-first CLI 원칙을 따른다.

- scaffold/snippet 생성 명령은 명시적인 `--json` spec을 사용한다
- validation/help/mode 같은 운영 명령은 contract에 맞는 전용 입력 형태를 사용한다
- 출력 기본값은 JSON
- preview가 기본값이고 실제 write는 `--apply`
- 실패는 deterministic JSON error payload로 반환
- 여러 scaffold/snippet 요청은 `batch`로 한 번에 처리
- `handle/on/use`, case, snippet shape, validator rule, template context는 profile recipe가 소유

## Layout

```text
packages/
  dev-cli/
    src/
      core/
      validators/
    tests/
  tcp/
    bin/tcp.mjs
  tcf/
    bin/tcf.mjs
  tcb/
    bin/tcb.mjs

profiles/
  registry.json
  shared/
    personal/v1/
  publisher/
    personal/v1/
  frontend/
    personal/v1/
  backend/
    personal/v1/
```

## Recipe Contract

각 profile command는 단순 help metadata가 아니라 recipe를 가진다.

- `inputSchema`
- `defaults`
- `namingPolicy`
- `normalizationRules`
- `validatorRules`
- `render`

`render`는 아래를 포함할 수 있다.

- `snippetTemplate`
- `templateFile`
- `templateFiles`
- `output.filePattern`
- `contextTokens`

shared override 규칙:

- object는 deep merge
- scalar는 override
- array는 append 후 dedupe

즉 core는 parser, batch executor, `$ref`, preview/apply, error envelope를 유지하고, 실제 command 규칙은 profile recipe를 해석해서 실행한다.

## Alias Surface

`tcp`
- role: `publisher`
- commands: `component`, `type`, `props`, `function`, `uiState`, `batch`

`tcf`
- role: `frontend`
- commands: `hook`, `apiHook`, `type`, `props`, `function`, `queryKey`, `endpoint`, `mapper`, `hookReturn`, `batch`

`tcb`
- role: `backend`
- commands: `module`, `requestDto`, `responseDto`, `entity`, `batch`

## Profile Resolution

> Current runtime contract
>
> - The CLI stores one global active profile per alias in `~/.try-claude-dev-cli.json`.
> - `mode set --mode <mode> --version <major>` is the only way to change the active profile.
> - General commands always use the stored global selection.
> - If no active selection exists, the CLI stays unset until the user configures one.
> - Remote `main/profiles/{role}/{mode}/{version}` is the runtime source of truth.
> - `mode set` validates the full remote profile contract by loading `profile.json` plus its `extends` and template chain.
> - `mode show` returns the stored value only and does not revalidate remote availability.
> - General commands do not accept `--mode`, `--version`, or `--profile` overrides.
> - `--help` and `help <command>` still work when mode is unset and return minimal setup guidance.

> Legacy note: the older registry-first bullets below are historical context only and are superseded by the current runtime contract above.

active profile 우선순위:

1. 명시 옵션: `--mode`, `--version`
2. global active selection: `~/.try-claude-dev-cli.json`
3. unset state until the user runs `mode set`

공개 계약은 mode와 major version만 가진다.

- 사용자는 `personal + v1` 같은 조합만 선택한다.
- `profiles/registry.json`은 role별 mode와 지원 major version 배열만 관리한다.
- config에는 `mode`, `version`만 저장한다.
- 실제 profile/template fetch는 항상 `main/profiles/{role}/{mode}/{version}` live 경로를 직접 사용한다.
- `mode set`과 `mode show`는 exact patch version을 받지 않는다.

예시 config:

```json
{
  "profiles": {
    "publisher": {
      "mode": "personal",
      "version": "v1"
    }
  }
}
```

예시 registry:

```json
{
  "publisher": {
    "personal": ["v1"]
  }
}
```

예시:

```bash
tcp mode set --mode personal --version v1
tcp mode show
tcp --help
```

## Publish Surface

publish 대상은 4개 패키지다.

- `@seojaewan/dev-cli-core`
- `@seojaewan/tcp`
- `@seojaewan/tcf`
- `@seojaewan/tcb`

wrapper는 각각 하나의 `bin`만 노출한다.

- `@seojaewan/tcp` -> `tcp`
- `@seojaewan/tcf` -> `tcf`
- `@seojaewan/tcb` -> `tcb`

수동 publish 순서:

1. `@seojaewan/dev-cli-core`
2. `@seojaewan/tcp`
3. `@seojaewan/tcf`
4. `@seojaewan/tcb`

중요:

- wrapper를 publish하기 전에 `main` 브랜치에 `profiles/registry.json`과 target `profiles/{role}/{mode}/{version}` 경로가 먼저 존재해야 한다.

profile hotfix 순서:

1. `main`에 `profiles/*` 수정 반영
2. 필요한 major version 디렉터리 내용 갱신
3. `profiles/registry.json`에서 지원 major version 배열을 유지
4. 사용자는 `mode set --version v1`로 해당 major contract를 선택

## Help Contract

기본 help는 탐색용 summary JSON이다.

```bash
tcp --help
tcf --help
tcb --help
```

에이전트가 매 작업마다 top-level `--help`에서 모든 contract를 읽을 필요는 없다.
top-level help는 명령 탐색, whenToUse, relatedCommands, flow discovery만 제공한다.

```bash
tcp help component --text
tcf help hook --text
tcf help apiHook --text
tcb help module --text
```

구조화된 상세 contract가 실제로 필요할 때만 command-scoped JSON help를 읽는다.

```bash
tcp help component
tcf help apiHook
tcb help requestDto
```

top-level `tcp --help`, `tcf --help`, `tcb --help`는 command discovery나 전체 contract audit가 필요할 때만 사용한다.

전체 command contract audit가 필요하면 `--full`을 사용한다.

```bash
tcp --help --full
tcf --help --full
tcb --help --full
```

사람용 가이드는 별도 `guide` 명령으로 본다.

```bash
tcp guide
tcf guide
tcb guide
tcp guide component
tcf guide hook
tcp guide --html > profiles/publisher/personal/v1/guide.html
```

`guide`의 source of truth도 profile 안의 `guide` 속성이다.
즉 machine rule과 human guide를 같은 `profile.json` 안에서 함께 관리한다.

현재 HTML guide는 `tcp`만 지원한다.

```bash
tcp guide --html > profiles/publisher/personal/v1/guide.html
tcp guide component --html > profiles/publisher/personal/v1/guide.html
```

`guide.html`은 self-contained read-only 문서이며, profile이 바뀌면 위 명령으로 다시 생성한다.

## Execution Model

spec-driven 생성 command는 `--json` spec을 받는다.

```bash
tcp component --json "{\"name\":\"ReviewCard\",\"path\":\"components/common/reviewCard\"}"
tcf hook --json "{\"name\":\"useScroll\",\"path\":\"hooks/utils/common\"}"
tcb requestDto --json "{\"name\":\"CreateProductRequest\",\"path\":\"product\",\"basePackage\":\"com.example.app\"}"
```

preview가 기본이며 실제 파일 생성은 `--apply`일 때만 수행한다.

```bash
tcp component --json "{\"name\":\"ReviewCard\",\"path\":\"components/common/reviewCard\"}"
tcp component --json "{\"name\":\"ReviewCard\",\"path\":\"components/common/reviewCard\"}" --apply
```

## Batch Contract

`batch`는 ordered `ops[]`를 순차 실행한다.
각 op는 앞 op 결과를 제한적으로 참조할 수 있다.

```bash
tcp batch --json "{
  \"ops\": [
    {
      \"id\": \"component\",
      \"command\": \"component\",
      \"spec\": {
        \"name\": \"ReviewCard\",
        \"path\": \"components/common/reviewCard\"
      }
    },
    {
      \"id\": \"props\",
      \"command\": \"props\",
      \"spec\": {
        \"members\": [
          { \"kind\": \"value\", \"name\": \"title\", \"type\": \"string\", \"required\": true },
          { \"kind\": \"callback\", \"name\": \"click\", \"params\": [] }
        ]
      }
    },
    {
      \"id\": \"uiState\",
      \"command\": \"uiState\",
      \"spec\": {
        \"category\": \"uiInteraction\",
        \"pattern\": \"toggle\",
        \"name\": \"menu\"
      }
    }
  ]
}"
```

`$ref` 형식:

- `opId.field.path`
- backward reference만 허용
- forward, self, unknown reference는 실패

예시:

```json
{
  "componentName": {
    "$ref": "component.normalizedSpec.name"
  }
}
```

batch 정책:

- 기본값은 preview
- 실제 write는 `--apply`
- write는 마지막에 한 번만 수행
- 하나라도 실패하면 전체 write 취소
- 기존 파일 patch/insert는 이번 범위에 포함하지 않음

## Shared Personal v1

`shared/personal/v1`는 `publisher`와 `frontend`가 공통으로 사용한다.

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
tcp type --json "{\"name\":\"TableColumn\",\"kind\":\"interface\"}"
tcf props --json "{\"members\":[{\"kind\":\"value\",\"name\":\"title\",\"type\":\"string\",\"required\":true}]}"
tcf function --json "{\"kind\":\"internalHandler\",\"name\":\"onClick\"}"
```

## Publisher Personal v1

`tcp component`

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

`tcp uiState`

- UI interaction intent를 받아 state + handler snippet 반환
- whitelist 강제 대신 UI state shell을 정규화

publisher 금지 패턴:

- `useEffect(`
- `fetch(`
- `axios.`
- `useQuery(`
- `useMutation(`

예시:

```bash
tcp component --json "{\"name\":\"ReviewCard\",\"path\":\"components/common/reviewCard\",\"props\":[{\"kind\":\"value\",\"name\":\"title\",\"type\":\"string\",\"required\":true}]}"
tcp uiState --json "{\"category\":\"uiInteraction\",\"pattern\":\"toggle\",\"name\":\"menu\"}"
```

## Frontend Personal v1

`tcf hook`

- 입력: `name`, `path`
- 출력: `{path}/{name}/index.ts`
- hook prefix는 profile recipe 기준으로 `use`
- 화살표 함수
- `export default`

`tcf apiHook`

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
tcf hook --json "{\"name\":\"useScroll\",\"path\":\"hooks/utils\"}"
tcf apiHook --json "{\"name\":\"useGetProduct\",\"path\":\"hooks/apis/product/queries\",\"kind\":\"query\"}"
tcf queryKey --json "{\"domain\":\"product\",\"scope\":\"detail\",\"params\":[\"productId\"]}"
tcf endpoint --json "{\"method\":\"GET\",\"resource\":\"product\",\"path\":\"/products/:productId\"}"
```

## Backend Personal v1

`tcb` personal v1은 Spring Boot baseline이다.

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
tcb module --json "{\"name\":\"Product\",\"path\":\"product\",\"basePackage\":\"com.example.app\"}"
tcb requestDto --json "{\"name\":\"CreateProductRequest\",\"path\":\"product\",\"basePackage\":\"com.example.app\",\"fields\":[{\"name\":\"name\",\"type\":\"String\",\"validations\":[\"NotBlank\"]}]}"
tcb responseDto --json "{\"name\":\"ProductResponse\",\"path\":\"product\",\"basePackage\":\"com.example.app\"}"
tcb entity --json "{\"name\":\"Product\",\"path\":\"product\",\"basePackage\":\"com.example.app\"}"
```

`basePackage`가 없으면 CLI는 Spring root package를 감지하려고 시도하고, 실패하면 명시적 JSON error를 반환한다.

## Success and Error Payloads

성공 응답:

```json
{
  "ok": true,
  "command": "function",
  "profile": "frontend/personal/v1",
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

## Ownership Notes

현재 v1에서는 아래 요소가 모두 profile recipe 기준으로 동작한다.

- `function`의 internal handler prefix
- `props`의 callback prefix
- `hook`과 `apiHook`의 hook prefix
- `uiState`의 state, setter, handler naming
- `queryKey`, `endpoint`, `mapper`, `hookReturn` snippet shape
- file template context와 validator rule

즉 `personal/v2`나 `company/v1`에서 prefix, shape, validation이 달라지면 core 수정 없이 recipe 변경으로 대응하는 구조다.

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
