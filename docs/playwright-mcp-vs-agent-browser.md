# Playwright MCP vs agent-browser 정리

> **Historical Reference:** 이 문서는 historical reference입니다. 현재 활성 E2E 아키텍처는 `plan-e2e-test` skill 기반의 contract-first 방식입니다. 계획 단계에서 최종 Playwright `.spec.ts` 코드를 생성하고, 구현이 이를 통과하도록 합니다. 아래 내용은 이전 Playwright agent pipeline (planner/generator/healer) 아키텍처에 대한 기술 분석으로, 참고용으로 보존합니다.

## 목적

이 문서는 이전 플러그인의 Playwright 기반 agent 구조와 `agent-browser`의 역할 차이를 정리하고,
`Playwright 테스트 자체를 agent-browser로 대체할 수 있는가?`라는 질문에 대한 결론을 남긴다.

## 한 줄 결론 (당시 분석)

`agent-browser`는 `Playwright Test`의 대체재라기보다, AI가 브라우저를 다루는 방식에서 `Playwright MCP`를 대체하거나 보완할 수 있는 브라우저 인터페이스에 가깝다.

## 핵심 개념 구분

### 1. Playwright Test

- 브라우저 E2E 테스트 프레임워크다.
- `.spec.ts` 테스트 파일을 실행한다.
- assertion, reporter, trace, CI 연동 같은 테스트 자산을 담당한다.
- 테스트 코드 작성과 실행 자체는 MCP가 없어도 가능하다.

### 2. Playwright MCP

- AI가 브라우저나 Playwright 테스트 런타임을 조작할 수 있게 해주는 도구 노출 계층이다.
- 즉, `Playwright Test`와는 별개의 레이어다.
- 브라우저 탐색, 클릭, 입력, 스냅샷 조회, 테스트 실행/디버그 같은 기능을 agent가 사용할 수 있게 만든다.

### 3. agent-browser

- AI agent용 브라우저 자동화 인터페이스다.
- 내부적으로 Playwright 또는 CDP를 활용할 수 있지만, agent에게는 작은 CLI 명령 집합과 압축된 snapshot/ref 기반 인터페이스를 제공한다.
- 목표는 브라우저 제어를 더 단순하고, 더 토큰 효율적으로 만드는 것이다.

## 이전 플러그인 구조 (retired)

당시 저장소는 Playwright MCP 위에 역할별 agent를 얹는 구조였다.

- `agents/playwright-test-planner.md`
  - 브라우저를 탐색해 테스트 시나리오 문서(`specs/`)를 만든다.
- `agents/playwright-test-generator.md`
  - 브라우저에서 실제 동작을 따라가며 Playwright 테스트 코드(`.spec.ts`)를 생성한다.
- `agents/playwright-test-healer.md`
  - 실패한 Playwright 테스트를 실행/디버그하고, 테스트 코드를 수정한다.

즉 구조적으로는 다음과 같았다.

`Playwright MCP = agent의 손발`

`planner / generator / healer = 그 손발을 써서 계획 작성, 테스트 코드 생성, 테스트 복구를 수행하는 역할`

## 기사 내용 해석

`https://www.productengineer.info/community/articles/pec/agent-browser`의 요지는 대략 다음과 같다.

- 문제 제기 대상은 `Playwright Test` 자체보다 `Playwright MCP` 같은 AI용 브라우저 인터페이스의 비효율성이다.
- 브라우저 조작 응답이 길고 무거우면 agent 컨텍스트를 많이 소모한다.
- `agent-browser`는 snapshot과 ref 기반 조작으로 응답을 압축해 토큰 사용량과 문맥 오염을 줄이려 한다.

따라서 이 글을 `Playwright 테스트를 버리고 agent-browser로 가자`로 읽는 것은 과한 해석이다.

더 정확한 해석은 다음과 같다.

- `Playwright Test`는 그대로 둘 수 있다.
- 하지만 AI가 브라우저를 탐색하는 인터페이스는 `Playwright MCP` 대신 `agent-browser` 같은 더 얇은 계층으로 바꿀 수 있다.

## 비교

| 항목 | Playwright Test | Playwright MCP | agent-browser |
|---|---|---|---|
| 역할 | 테스트 프레임워크 | AI용 브라우저/테스트 제어 계층 | AI용 브라우저 인터페이스 |
| 주 관심사 | 테스트 코드 실행 | 브라우저 조작, 테스트 런타임 조작 | 브라우저 탐색/조작 단순화 |
| MCP 필요 여부 | 필요 없음 | 해당 레이어 자체가 MCP | 필요 없음 |
| 테스트 코드 생성/수정 | 가능하지만 직접 담당하진 않음 | agent가 생성/수정할 수 있게 보조 | agent가 생성 작업에 참고 가능 |
| 테스트 실행 | 직접 담당 | 실행 도구 노출 가능 | 직접적인 테스트 프레임워크는 아님 |
| 장점 | CI, reporter, trace, assertion | 세밀한 조작 가능 | 토큰 효율, 단순한 인터페이스 |
| 약점 | 브라우저 탐색 UX는 별도 필요 | tool surface가 커질 수 있음 | 테스트 자산 체계 자체는 약함 |

## 대체 가능 범위

### 가능한 대체

- 브라우저 탐색
- ad-hoc UI 검증
- 웹 리서치형 자동화
- 단순 흐름 재현

### 대체하기 어려운 것

- Playwright `.spec.ts` 기반 회귀 테스트 체계
- assertion/reporter/trace 중심 CI 테스트 자산
- 현재 플러그인의 `planner -> generator -> healer` 테스트 파이프라인 전체

## 당시 실무적 결론

가장 현실적인 선택은 전면 교체보다 하이브리드였다.

- 브라우저 탐색 계층
  - `Playwright MCP` 대신 `agent-browser`를 검토할 수 있었다.
- 테스트 자산 계층
  - Playwright Test는 유지하는 편이 나았다.
- 당시 플러그인 구조
  - `planner / generator / healer` 파이프라인은 유지하고, 필요하면 브라우저 탐색 부분만 더 얇게 바꾸는 방식이 적절했다.

> **현재 아키텍처 참고:** planner/generator/healer 파이프라인은 retired되었다. 현재 E2E 테스트는 `plan-e2e-test` skill이 계획 단계에서 contract artifact로 생성하며, 라이브 브라우저 탐색 없이 deterministic Playwright 코드를 작성한다.

## 요약

- `Playwright 테스트를 쓰는 것`과 `Playwright MCP를 쓰는 것`은 다른 문제다.
- 테스트 코드 작성/실행은 꼭 MCP가 아니어도 된다.
- `agent-browser`는 `Playwright Test`의 대체재라기보다 `Playwright MCP`의 대체 또는 보완 후보다.
- 이 저장소에서는 전면 교체보다 `탐색은 agent-browser, 테스트는 Playwright 유지`가 더 자연스럽다.

## 참고 링크

- PEC article: `https://www.productengineer.info/community/articles/pec/agent-browser`
- agent-browser repo: `https://github.com/vercel-labs/agent-browser`
- Playwright Test Agents docs: `https://playwright.dev/docs/test-agents`
- Playwright MCP repo: `https://github.com/microsoft/playwright-mcp`
