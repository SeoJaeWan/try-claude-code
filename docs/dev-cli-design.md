# Dev CLI Design

## Summary

`tcp`, `tcf`, `tcb`는 하나의 `@try-claude/dev-cli` 엔진 위에서 동작한다.  
실제 규칙과 scaffold 정의는 repo-local `profiles/`에서 읽고, CLI는 JSON 기본 help, non-interactive 실행, deterministic error payload, `--dry-run`을 제공한다.

이 구조는 Justin Poehnelt의 agent-first CLI 원칙을 따른다.

- machine-readable output 기본값
- 사람용 출력은 명시 opt-in
- prompt 없이 명시적 입력만 받음
- 실패 시 안정적인 JSON error contract 제공

## Goals

- 에이전트가 수동으로 scaffold를 만들지 않고 반드시 CLI를 먼저 통과하게 한다.
- profile/version에 따라 경로 규칙, 파일 패턴, 템플릿, validator를 바꿀 수 있게 한다.
- `publisher`, `frontend`, `backend` 스킬이 같은 core runtime을 공유하게 한다.
- help와 generator가 같은 profile 정의를 읽게 해 drift를 줄인다.

## Package Layout

```text
package.json
pnpm-workspace.yaml

packages/
  dev-cli/
    bin/
      tcp.mjs
      tcf.mjs
      tcb.mjs
    src/
      run-cli.mjs
      core/
      validators/
    tests/

profiles/
  shared/
    personal/v1/
  publisher/
    personal/v1/
  frontend/
    personal/v1/
  backend/
    personal/v1/
```

## Alias Surface

`tcp`
- publisher profile 사용
- `component`, `type`, `validate`, `mode`, `--help`

`tcf`
- frontend profile 사용
- `hook`, `apiHook`, `type`, `validate`, `mode`, `--help`

`tcb`
- backend profile 사용
- `module`, `requestDto`, `responseDto`, `entity`, `validate`, `mode`, `--help`

## Profile Resolution

active profile 우선순위는 아래와 같다.

1. 명시 옵션: `--profile`, `--mode`, `--version`
2. repo-local pin: `<repo-root>/.try-claude-dev-cli.json`
3. global default: `~/.try-claude-dev-cli.json`
4. fallback: `personal/v1`

예:

```bash
tcp mode set --mode personal --version v1
tcp mode set --mode personal --version v1 --repo
tcp --help
```

## Help Contract

기본 help는 JSON이다.

```bash
tcp --help
tcf --help
tcb --help
```

사람용은 `--text`를 사용한다.

```bash
tcp --help --text
tcf --help --text
tcb --help --text
```

예시 JSON shape:

```json
{
  "ok": true,
  "alias": "tcp",
  "role": "publisher",
  "id": "publisher/personal/v1",
  "activeProfile": {
    "source": "default",
    "mode": "personal",
    "version": "v1"
  },
  "commands": {
    "component": {
      "description": "Generate a publisher UI component",
      "output": {
        "filePattern": "{path}/index.tsx"
      }
    }
  }
}
```

## Shared Personal v1

`shared/personal/v1`는 `publisher`와 `frontend`가 공통으로 읽는다.

- path segment: `camelCase`
- 함수 스타일: 화살표 함수
- 내부 handler: `handle*`
- props callback: `on*`
- 배열 이름: 복수형, `List`/`Array` suffix 금지
- shared type path: `types/common`, `types/{domain}`

공통 `type` 명령도 shared profile에 있다.

```bash
tcp type TableColumn --path types/common
tcf type ProductSummary --path types/product --kind interface
```

## Publisher Personal v1

`tcp component <Name> --path <path>`

- 출력: `{path}/index.tsx`
- 예: `page/homePage/index.tsx`
- 이름: PascalCase
- path segment: `camelCase`
- 컴포넌트: 화살표 함수
- `export default`
- `Props` 인터페이스 포함
- props 구조분해는 함수 본문 첫 줄에서 수행

publisher 금지 패턴:

- `useEffect(`
- `fetch(`
- `axios.`
- `useQuery(`
- `useMutation(`

허용 state는 UI interaction only:

- toggle
- sidebar
- accordion
- modal
- tab

예:

```bash
tcp component HomePage --path page/homePage
tcp component Table --path components/common/table
```

## Frontend Personal v1

`tcf hook <Name> --path <path>`

- 출력: `{path}/{name}/index.ts`
- 이름은 반드시 `use*`
- 화살표 함수
- `export default`

`tcf apiHook <Name> --path <path> --kind query|mutation`

- TanStack Query baseline
- query path: `hooks/apis/{domain}/queries/...`
- mutation path: `hooks/apis/{domain}/mutations/...`

예:

```bash
tcf hook useScroll --path hooks/utils
tcf hook useToggle --path components/common/toggle/hooks
tcf apiHook useGetProduct --path hooks/apis/product/queries --kind query
tcf apiHook useCreateProduct --path hooks/apis/product/mutations --kind mutation
```

## Backend Personal v1

`tcb`는 Spring Boot baseline이다.

사실 기반 defaults:

- default package 회피
- application class는 root package 상단
- request validation은 `@Valid`
- REST error baseline은 `@ControllerAdvice`

v1 선택:

- package-by-feature
- path segment는 lower-case
- feature 내부 구조:
  - `controller`
  - `service`
  - `dto`
  - `entity`
  - `repository`

예:

```bash
tcb module Product --path product --base-package com.example.app
tcb requestDto CreateProductRequest --path product --base-package com.example.app
tcb responseDto ProductResponse --path product --base-package com.example.app
tcb entity Product --path product --base-package com.example.app
```

`--base-package`가 없으면 CLI는 Spring root package를 감지하려고 시도하고, 실패하면 명시적 JSON error를 반환한다.

## Validation and Generation

생성 책임:

- 폴더 생성
- 파일 생성
- 템플릿 렌더링
- path/name 규칙 검증
- 금지 패턴 검증

검증 책임:

- 명령 입력 검증
- 생성 전 path/name 검증
- profile 금지 패턴 검증
- backend root package 검증

예:

```bash
tcp validate component --content "const HomePage = () => { return <div />; }"
tcf validate apiHook --path hooks/apis/product/queries --name useGetProduct --kind query
tcb validate module --path product --name Product --base-package com.example.app
```

## Why This Structure

기존 `3개 npm 패키지` 방식보다 유지비가 낮다.

- 배포 단위는 `packages/dev-cli` 하나
- 확장 단위는 `profiles/...` 여러 개
- `company/v1`, `company/v2` 추가 시 engine 재구현이 필요 없다

즉, 바뀌는 것은 profile이고, engine은 안정적으로 유지한다.
