# Playwright MCP vs agent-browser 정리

> **Historical Reference:** 이 문서는 historical reference입니다. 현재 활성 E2E 아키텍처는 `plan-e2e-test` skill 기반의 contract-first 방식입니다. 계획 단계에서 최종 Playwright `.spec.ts` 코드를 생성하고, 구현이 이를 통과하도록 합니다. 아래 내용은 이전 Playwright agent pipeline (planner/generator/healer) 아키텍처에 대한 기술 분석으로, 참고용으로 보존합니다.

## 목적

이 문서는 이전 플러그인의 Playwright 기반 agent 구조와 `agent-browser`의 역할 차이를 정리하고,
`Playwright 테스트 자체를 agent-browser로 대체할 수 있는가?`라는 질문에 대한 결론을 남긴다.

## 한 줄 결론 (당시 분석)

`agent-browser`는 `Playwright Test`의 대체재가 아니라, `Playwright MCP`의 브라우저 조작 계층을 더 토큰 효율적으로 바꿀 수 있는 대안이다. 현재 구조에서 토큰을 더 쓸 이유는 없으므로 도입을 검토할 가치가 있다.

## 핵심 개념 구분

### 1. Playwright Test

- 브라우저 E2E 테스트 프레임워크다.
- `.spec.ts` 테스트 파일을 실행한다.
- assertion, reporter, trace, CI 연동 같은 테스트 자산을 담당한다.
- 테스트 코드 작성과 실행 자체는 MCP가 없어도 가능하다.

### 2. Playwright MCP (두 개의 레이어)

MCP는 두 가지가 존재한다.

| 패키지 | 역할 | 제공 도구 |
|---|---|---|
| `@playwright/mcp` (microsoft/playwright-mcp) | 범용 브라우저 자동화 MCP 서버 | `browser_*` 도구만 |
| Playwright Test Agents (v1.56+, microsoft/playwright 본체) | 테스트 워크플로우 전용 MCP | `browser_*` + `planner_*` + `generator_*` + `test_*` |

**Playwright Test Agents가 `@playwright/mcp`의 상위 집합**이다. `browser_*` 도구를 자체 포함하므로 별도 `@playwright/mcp` 연결이 필요 없다.

### 3. Playwright Test Agents 전용 도구

| 도구 | 기능 |
|---|---|
| `planner_setup_page` | 브라우저 페이지 초기화. 대상 URL을 열고 탐색 준비. 다른 도구 전에 1회 호출 필수 |
| `planner_save_plan` | 작성한 테스트 시나리오를 `specs/*.md` 마크다운 파일로 저장 |
| `generator_setup_page` | 특정 시나리오용 페이지 초기화. 브라우저 컨텍스트를 해당 시나리오에 맞게 준비 |
| `generator_read_log` | 시나리오 실행 중 기록된 모든 브라우저 인터랙션 로그 조회 (셀렉터, 로케이터 등) |
| `generator_write_test` | 로그 기반으로 만든 `.spec.ts` 소스 코드를 테스트 파일로 저장 |
| `test_run` | Playwright 테스트 실행 |
| `test_debug` | 실패한 테스트를 디버그 모드로 실행 (에러 지점에서 일시정지) |

이 도구들은 브라우저 조작이 아니라 **워크플로우 관리 도구**다. agent-browser로 대체할 대상이 아니다.

### 4. agent-browser

- AI agent용 브라우저 자동화 인터페이스다.
- 내부적으로 Playwright 또는 CDP를 활용할 수 있지만, agent에게는 최소한의 CLI 명령 집합과 압축된 snapshot/ref 기반 인터페이스를 제공한다.
- 목표는 브라우저 제어를 더 단순하고, 더 토큰 효율적으로 만드는 것이다.

## a11y tree: 둘 다 사용하지만 방식이 다르다

Playwright MCP와 agent-browser **모두 a11y tree(접근성 트리)를 사용**한다. 원시 DOM HTML이 아니다.

핵심 차이는 **응답 방식**이다.

### Playwright MCP의 방식

- 매 액션마다 **전체 a11y tree를 자동 반환**
- 버튼 하나 클릭해도 응답에 전체 트리(~12,891자)가 딸려옴
- 도구 26개 → agent가 매번 어떤 도구를 쓸지 선택해야 함

### agent-browser의 방식 (4단계 Snapshot + Refs)

1. **Tree 추출**: `page.accessibility.snapshot()` 호출
2. **인터랙티브 필터링**: onclick, cursor:pointer, tabindex 있는 요소만 추출
3. **Ref 할당**: 필터링된 요소에 짧은 식별자 부여 (`@e1`, `@e2`, `@e3`)
4. **RefMap 캐싱**: 데몬 메모리에 매핑 저장, `click @e1` → `getByRole("button", { name: "Sign In" })` 자동 변환

액션 실행 후 응답은 `Done` (6자) — **전체 트리를 다시 보내지 않는다**. agent가 상태를 알고 싶으면 명시적으로 `snapshot`을 요청해야 한다.

### 토큰 효율 수치 비교

| 상황 | Playwright MCP | agent-browser | 절감 |
|---|---|---|---|
| 홈페이지 스냅샷 | 8,247자 | 280자 | -96.6% |
| 버튼 클릭 응답 | 12,891자 | 6자 (`Done`) | -99.9% |
| 평균 응답 | 3,112자 | 328자 | -89.5% |
| **총 토큰 절감** | | | **~93%** |

## 압축의 트레이드오프: 비인터랙티브 요소

agent-browser의 압축 스냅샷은 인터랙티브 요소만 포함한다. 비인터랙티브 요소(본문 텍스트, 에러 메시지, 리스트, 테이블 데이터 등)는 **필터링되어 보이지 않는다**.

### 문제가 되는 상황

| 상황 | 이유 |
|---|---|
| 텍스트 변경 검증 | 에러 메시지, 성공 메시지, 본문 업데이트 등이 비인터랙티브 요소 |
| 리스트 렌더링 확인 | `<li>` 목록 추가/삭제 확인 불가 |
| 로딩 상태 확인 | 스피너, "로딩중..." 텍스트가 필터에서 빠짐 |
| 테이블 데이터 확인 | `<td>` 셀 내용은 인터랙티브가 아님 |

### 보충 방법

1. **`snapshot` 전체 호출** — 가능하지만 Playwright MCP와 토큰 소모 차이 없어짐
2. **`evaluate`로 특정 요소 직접 조회** — agent가 DOM 셀렉터를 미리 알아야 함
3. **커스텀 필터 확장** — 필터를 넓히면 압축률 하락

### 근본적 딜레마

```
압축률 ↑  →  정보 손실 ↑  →  검증 능력 ↓
압축률 ↓  →  정보 손실 ↓  →  Playwright MCP와 차이 없음
```

**그러나 Playwright MCP보다 토큰을 더 쓰는 경우는 없다.** snapshot을 호출해도 Playwright MCP와 동일하거나 약간 적다. 최악의 경우에도 동등하고, 대부분 더 적다.

```
MCP:            항상 전체 트리 반환  →  토큰 소모 일정(높음)
agent-browser:  필요할 때만 snapshot →  토큰 소모 ≤ MCP (항상)
```

## 이전 플러그인 구조 (retired)

### 아키텍처

당시 저장소는 Playwright MCP 위에 역할별 agent를 얹는 구조였다.

```
skills/playwright-test-planner/SKILL.md   → 워크플로우 지시사항 + agent: 속성으로 독립 컨텍스트
skills/playwright-test-generator/SKILL.md → 워크플로우 지시사항 + agent: 속성으로 독립 컨텍스트
skills/playwright-test-healer/SKILL.md    → 워크플로우 지시사항 + agent: 속성으로 독립 컨텍스트

agents/playwright-test-planner.md     → 메타데이터 (tools, model, color) + skill 포인터
agents/playwright-test-generator.md   → 메타데이터 (tools, model, color) + skill 포인터
agents/playwright-test-healer.md      → 메타데이터 (tools, model, color) + skill 포인터
```

즉 구조적으로는 다음과 같았다.

- **skill**: 트리거 조건 + 워크플로우 전체 + `agent:` 속성으로 독립 컨텍스트 실행
- **agent**: 도구 목록, 모델, 색상 등 실행 환경 메타데이터 + skill 참조 포인터

### 워크플로우

```
[planner]
  planner_setup_page  →  browser_* 로 탐색  →  planner_save_plan
  "페이지 열고"           "돌아다니면서 파악"     "specs/에 시나리오 저장"

[generator]
  generator_setup_page  →  browser_* 로 시나리오 실행  →  generator_read_log  →  generator_write_test
  "페이지 열고"             "실제로 따라가보고"             "로그 가져오고"          ".spec.ts 파일 생성"

[healer]
  test_run  →  test_debug  →  browser_snapshot 등으로 진단  →  Edit로 코드 수정  →  test_run 재실행
  "테스트 돌리고"  "실패하면 디버그"  "뭐가 잘못됐나 확인"           "고치고"              "다시 돌림"
```

## agent-browser 도입 적합도

### agent별 분석

| agent | 주요 패턴 | agent-browser 적합도 | 이유 |
|---|---|---|---|
| **generator** | 클릭 → 입력 → 이동 → 클릭 (행동 시퀀스 중심) | **높음** | `Done` 응답으로 93% 절감에 가장 가까움 |
| **planner** | 탐색 + 클릭/이동 혼합 | **중간** | 탐색 중 클릭/이동은 절감, 전체 구조 파악 시 snapshot 필요 |
| **healer** | test_run/test_debug + 진단 | **낮음** | 대부분 Playwright Test 런타임 도구에 의존, 브라우저 조작 비중 낮음 |

### 대체 불가 영역

`planner_setup_page`, `planner_save_plan`, `generator_setup_page`, `generator_write_test`, `generator_read_log`, `test_run`, `test_debug` — 이 도구들은 Playwright Test Agents 전용 **워크플로우 관리 도구**이므로 agent-browser와 무관하다. 어떤 브라우저 인터페이스를 쓰든 이 도구들은 그대로 필요하다.

### 도입 시 걸림돌

| 문제 | 설명 |
|---|---|
| 도구 혼용 | agent-browser + Playwright Test 전용 도구를 동시에 연결해야 함 |
| agent-browser 성숙도 | Vercel Labs 프로젝트로, 프로덕션 안정성이 Playwright MCP 대비 검증이 덜 됨 |
| 설정 복잡성 | 하나의 파이프라인에 두 가지 브라우저 인터페이스를 혼용하는 유지보수 비용 |

## 검증 계획

현재 3개 skill을 skill-creator로 eval 환경을 구성한 상태다. 검증 순서:

1. **현재 Playwright MCP 기반**으로 eval 실행 → 성능 기준선(토큰, 시간, 품질) 측정
2. **agent-browser로 `browser_*` 도구 교체** 후 동일 eval 실행 → 성능 비교
3. 수치 기반으로 도입 여부 판단

## 비교 요약

| 항목 | Playwright Test | Playwright MCP | agent-browser |
|---|---|---|---|
| 역할 | 테스트 프레임워크 | AI용 브라우저/테스트 제어 계층 | AI용 브라우저 인터페이스 |
| 주 관심사 | 테스트 코드 실행 | 브라우저 조작, 테스트 런타임 조작 | 브라우저 탐색/조작 단순화 |
| a11y tree 사용 | 해당 없음 | 매 액션마다 전체 반환 | 인터랙티브 요소만 필터 + 온디맨드 |
| 도구 수 | 해당 없음 | 26개+ | 2~3개 |
| MCP 필요 여부 | 필요 없음 | 해당 레이어 자체가 MCP | 필요 없음 |
| 장점 | CI, reporter, trace, assertion | 세밀한 조작, 테스트 런타임 통합 | 토큰 효율 (~93% 절감), 행동 선택 공간 축소 |
| 약점 | 브라우저 탐색 UX는 별도 필요 | tool surface 비대 (26개+), 매 응답 토큰 과다 | 비인터랙티브 요소 정보 손실, 테스트 자산 체계 없음 |

## 당시 실무적 결론

가장 현실적인 선택은 전면 교체보다 하이브리드였다.

- 브라우저 탐색 계층
  - `Playwright MCP` 대신 `agent-browser`를 검토할 수 있었다.
- 테스트 자산 계층
  - Playwright Test는 유지하는 편이 나았다.
- 당시 플러그인 구조
  - `planner / generator / healer` 파이프라인은 유지하고, 필요하면 브라우저 탐색 부분만 더 얇게 바꾸는 방식이 적절했다.

> **현재 아키텍처 참고:** planner/generator/healer 파이프라인은 retired되었다. 현재 E2E 테스트는 `plan-e2e-test` skill이 계획 단계에서 contract artifact로 생성하며, 라이브 브라우저 탐색 없이 deterministic Playwright 코드를 작성한다.

## 결론

- `Playwright 테스트를 쓰는 것`과 `Playwright MCP를 쓰는 것`은 다른 문제다.
- 둘 다 a11y tree를 쓰지만, 응답 방식(자동 전체 반환 vs 온디맨드)이 다르다.
- agent-browser가 Playwright MCP보다 토큰을 더 쓰는 경우는 없다. 최악에도 동등, 대부분 더 적다.
- `agent-browser`는 `Playwright Test`의 대체재가 아니라 `Playwright MCP`의 `browser_*` 도구 대체 후보다.
- 워크플로우 도구(`planner_*`, `generator_*`, `test_*`)는 어떤 브라우저 인터페이스를 쓰든 그대로 필요하다.
- eval 기반 수치 비교를 통해 실제 도입 여부를 판단한다.

## 참고 링크

- PEC article: `https://www.productengineer.info/community/articles/pec/agent-browser`
- agent-browser repo: `https://github.com/vercel-labs/agent-browser`
- Playwright Test Agents docs: `https://playwright.dev/docs/test-agents`
- Playwright MCP repo: `https://github.com/microsoft/playwright-mcp`
- Vercel D0 사례 (도구 17개→2개, 성공률 80%→100%): PEC article 내 참조
