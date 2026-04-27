from pathlib import Path


ROOT = Path.home() / ".codex" / "reviewWiki"
CORE = ROOT / "wiki" / "core"


DOCS = {
    "source-precedence.md": """---
doc_type: core
title: "출처 우선순위"
summary: "계획 판단에서 저장소 내부 기준, 코어 정책, 패턴 지침, 원문 근거의 우선순위를 정한다."
---

# 출처 우선순위

## 개요
계획 판단에서 저장소 내부 기준, 코어 정책, 패턴 지침, 원문 근거의 우선순위를 정한다.

## 필수 읽기 순서

1. `wiki/registry.json`을 먼저 읽는다.
2. review wiki 지침을 고르기 전에 현재 단계 또는 역할을 정한다.
3. `stage_core.{stage}`가 있으면 그 목록을 순서대로 읽고, 없으면 registry의 `core` 배열을 사용한다.
4. 현재 단계의 registry 선택 정책으로 패턴 후보를 고른다.
5. 선택된 패턴이 모호하거나 다른 패턴과 충돌하거나 직접 근거 확인이 필요할 때만 원문 근거를 읽는다.

## 우선순위

지침이 충돌하면 아래 순서를 따른다.

1. 저장소 내부 기준
2. 코어 문서
3. 선택된 패턴 파일
4. 원문 근거

## 규칙

- registry, 선택된 코어 문서 목록, 목록에 있는 코어 문서가 없거나 읽을 수 없으면 review wiki를 먼저 고친다.
- 패턴 파일은 무조건 적용되는 절차가 아니라 조건부 지침으로 취급한다.
- 런타임에서 발견한 패턴 충돌은 blocker이자 lint 결함으로 취급한다.
- 원문 근거만으로 저장소 내부 소스, config, 검증 계약을 덮어쓰지 않는다.
- `stage_core.brainstorm`이 있으면 `brainstorm`을 계획 전용 코어 문서로 넓히지 말고, 그 단계에 맞는 좁은 사전 확인 계약을 사용한다.

## 관련 문서
- 적용 단계: [[wiki/tags/stage/brainstorm|stage: brainstorm]], [[wiki/tags/stage/architect|stage: architect]], [[wiki/tags/stage/review|stage: review]]
""",
    "decision-policy.md": """---
doc_type: core
title: "의사결정 정책"
summary: "정보 부족을 blocking, derivable, deferrable로 나누고 계획 전에 닫아야 할 결정을 정의한다."
---

# 의사결정 정책

## 개요
정보 부족을 `blocking`, `derivable`, `deferrable`로 나누고 계획 전에 닫아야 할 결정을 정의한다.

## 정보 부족 분류

- `blocking`: 아키텍처, 계약, 테스트 범위, 구성, 사용자에게 보이는 동작을 바꿀 수 있다.
- `derivable`: 사용자 입력 없이 로컬 저장소 문맥에서 확인할 수 있다.
- `deferrable`: 구현이나 검증을 실질적으로 바꾸지 않는 낮은 위험의 기본값이다.

## Blocking 규칙

- `blocking` 모호성이 남아 있으면 계획 산출물을 쓰지 않는다.
- 사용자에게 보이는 모호성이 아래 항목을 바꾸면 계획 전에 해결한다.
  - 영향을 받는 표면
  - 중요한 사용자 행동
  - 눈에 보이는 성공 상태 또는 실패 결과
  - 표현만 바꾸는지, 동작까지 바꾸는지
- 동작을 바꾸는 모호성이 아래 항목을 바꾸면 계획 전에 해결한다.
  - 트리거 또는 사전 조건
  - 반드시 발생해야 하는 표준 출력
  - 발생하면 안 되는 중요한 부정 출력
  - 수신자, 전달 대상, 최종 해석 경계

## 시나리오 계약 최소 조건

동작을 바꾸는 단계 상세 문서마다 아래를 명시한다.

- 시나리오 또는 트리거
- 입력과 사전 조건
- 반드시 발생해야 하는 표준 출력
- 부재가 정책의 일부라면 발생하면 안 되는 중요한 출력
- 관련될 때 수신자, 전달 대상, 최종 해석 경계

단일 경로보다 실행 위험이 크면 아래도 명시한다.

- 승자 규칙
- 패자 no-op 규칙
- 종료 상태 규칙
- 지연 실행 경로
- 부수 효과 결합

## 계획 규칙

- 사용자에게 묻기 전에 로컬 문맥에서 확인 가능한 것을 먼저 도출한다.
- 확인 질문이 불가피할 때만 간결하고 실행 가능한 질문을 한다.
- `deferrable` 항목은 구성이나 검증을 바꾸지 않을 때만 본문 안 기본값 또는 짧은 제약으로 유지한다.
- 해결되지 않은 `blocking` 결정을 관련 계획 산출물 밖에 숨기지 않는다.

## 관련 문서
- 적용 단계: [[wiki/tags/stage/brainstorm|stage: brainstorm]], [[wiki/tags/stage/architect|stage: architect]], [[wiki/tags/stage/review|stage: review]]
""",
    "plan-artifact-contract.md": """---
doc_type: core
title: "계획 산출물 계약"
summary: "plan.md와 단계 상세 문서가 어떤 정보를 어디에 담아야 하는지 정한다."
---

# 계획 산출물 계약

## 개요
`plan.md`와 단계 상세 문서가 어떤 정보를 어디에 담아야 하는지 정한다.

## 구성 기본값

- 기본은 `./plans/{task-slug}/plan.md`에 하나의 순차 실행 계획을 둔다.
- 여러 실행 계획은 각 경계가 독립적으로 병합 가능하고 검토 가능할 때만 사용한다.
- 별도의 overview, index, DAG, root graph 파일을 생성하지 않는다.

## 필수 산출물

모든 실행 계획 디렉터리는 아래를 포함해야 한다.

- `**Branch:** {type}/{task-slug}`
- 검토자용 `plan.md` 하나
- 단계마다 `phases/{nn}-{phase-slug}.md` 아래 연결된 단계 상세 문서 하나

## `plan.md` 최상위 섹션

모든 `plan.md`는 아래 섹션을 순서대로 포함한다.

1. `요청과 범위`
2. `변경 형상`
3. `잠긴 계약`
4. `실행 흐름`
5. `리스크와 검증`
6. `검토 체크리스트`

## `plan.md` 머리말

`요청과 범위` 앞에는 컨트롤러가 탐색하기 위한 짧은 머리말을 둘 수 있다.

- task slug와 일치하는 visible `Worktree dir` line 하나
- 아래 열을 가진 간단한 라우팅 표 하나
  - `#`
  - `Phase`
  - `Agent`

존재할 때:

- `Phase`는 연결된 단계 상세 문서 path를 가리킨다.
- `Agent`는 연결된 단계 상세 문서의 `owner_agent`와 일치해야 한다.
- 이 표는 탐색용 메타데이터이며 기술 실행 계약이 아니다.

## `plan.md` 단계 요약

단계 요약은 한 단계당 한 행으로 유지하고, 단계 내부 파일 지도나 시나리오 표를 반복하지 않는다.

권장 열:

- `Phase`
- `목적`
- `주요 변경`
- `완료 신호`
- `상세 문서`

## 단계 상세 문서 요약

모든 연결된 단계 상세 문서는 아래로 시작한다.

- `목표와 완료 신호` 표
- `작업 흐름` 표
- `검증` 섹션

## 단계 상세 문서 필드

모든 연결된 단계 상세 문서는 아래를 포함해야 한다.

- `owner_agent`
- `목표`
- `boundary`
- `input`
- `output`
- `작업`
- `검증`

선택 필드:

- `선행 조건`
- `제약`
- `side effects`
- `failure/validation`

## 일치와 분리

- `plan.md`는 검토자용 산출물로 취급한다.
- 단계 상세 문서는 기술 실행 산출물로 취급한다.
- `plan.md`와 연결된 상세 문서는 서로 일치해야 한다. 상세 문서는 단계를 구체화할 수 있지만 경계나 결과를 바꾸면 안 된다.
- 시나리오 입출력 계약과 상세 검증 명령은 `plan.md`에 넣지 않는다. 간단한 라우팅 표는 허용되지만 실행 라우팅 계약은 단계 상세 문서에 둔다.
- 파일 단위 변경 지도와 사람이 읽을 수 있는 완료 조건은 `plan.md`에 보이게 유지한다.
- `검증`은 실행 가능한 체크리스트 항목으로 작성한다.

## 관련 문서
- 적용 단계: [[wiki/tags/stage/architect|stage: architect]], [[wiki/tags/stage/review|stage: review]]
""",
    "execution-routing.md": """---
doc_type: core
title: "실행 라우팅"
summary: "작업 유형과 위험에 맞는 실행 agent, 단계, 인계 경계를 정한다."
---

# 실행 라우팅

## 개요
작업 유형과 위험에 맞는 실행 agent, 단계, 인계 경계를 정한다.

## 표준 `owner_agent` 라우팅

- `frontend-developer`: 프론트엔드 UI, 반응형 다듬기, 상태 전환, 이벤트 처리, API 연동, 검증 로직
- `backend-developer`: API, DB, auth, server 로직
- `general-developer`: infrastructure, DevOps, CI/CD, deploy/runtime config, 저장소 단위 도구
- `visual-comparator`: 기준 기반 UI 비교, capture/diff 산출물 생성, 불일치 보고
- `figma-parity-auditor`: Figma URL 기준의 parity 감사, 구조화된 차이 보고, 저장소 내부 parity 산출물 생성

## 규칙

- 단계 상세 문서마다 정확히 하나의 실행 agent를 사용한다.
- `plan-reviewer`, `plan-materializer` 같은 계획 agent를 `owner_agent` 값으로 쓰지 않는다.
- UI와 로직이 같이 있다는 이유만으로 단계를 나누지 않는다.
- `visual-comparator`는 비교와 보고 단계에만 사용한다. 저장소 내부 근거 산출물은 만들 수 있지만 제품 코드 수정은 이후 `frontend-developer` 단계가 소유한다.
- `visual-comparator`는 외부 이미지, screenshot set, live URL 기준에만 쓰고 Figma URL에는 쓰지 않는다.
- `figma-parity-auditor`는 Figma URL 기준에 대한 비교와 보고 단계에만 쓴다. 저장소 내부 parity 근거 산출물은 만들 수 있지만 제품 코드 수정은 이후 `frontend-developer` 단계가 소유한다.
- 라우팅을 고정하기 전에 작업을 지배하는 최소한의 저장소 내부 명령, config, 소스 트리 관례만 확인한다.
- 저장소 내부 실행 계약을 path 정책, naming, 검증, scaffold shape, rollout 제약의 기준 정보로 취급한다.

## 관련 문서
- 적용 단계: [[wiki/tags/stage/architect|stage: architect]], [[wiki/tags/stage/review|stage: review]]
""",
    "test-and-review-handoff.md": """---
doc_type: core
title: "테스트와 리뷰 핸드오프"
summary: "계획에서 테스트 구체화와 리뷰가 추론 없이 이어지도록 필요한 계약을 정한다."
---

# 테스트와 리뷰 핸드오프

## 개요
계획에서 테스트 구체화와 리뷰가 추론 없이 이어지도록 필요한 계약을 정한다.

## Architect 책임

- `architect`는 plan만 작성한다.
- `architect`는 소스 트리 test를 생성하지 않는다.
- `architect`는 제품 코드를 수정하지 않는다.
- `architect`는 `plan.md`와 단계 상세 문서의 컨트롤러용 산출물 구조를 소유한다.

## `plan-review`

- `plan-review`는 읽기 전용이다.
- 사용자가 구현 전에 독립 사전 리뷰를 명시적으로 원할 때 사용한다.
- `plan-review`가 blocker를 보고하면 plan을 `architect`로 되돌린다.
- 실행 준비도, 계약 명확성, 이후 테스트 도출을 바꾸지 않는 readability-only 또는 browser-UX-only concern으로 finding을 만들지 않는다.

## `plan-materialize`

- 구현 plan에는 `plan-materializer`를 자동 선행 조건으로 취급한다.
- `plan-materialize`는 `unit`, 선택된 `e2e`, `skip`, `block`을 결정한다.
- plan 계약이 불완전하거나 서로 모순되거나 필요한 setup이 없으면 추측하지 말고 멈춘다.

## `visual-comparator`

계획이 외부 시각 기준에 맞춰 UI를 바꾸고, 완료 판정이 그 기준과의 비교에 의존하면 이후 `visual-comparator` 단계를 추가한다.

예:

- visual baseline으로 쓰는 live site 또는 design-system page
- acceptance target으로 쓰는 screenshot 또는 image set
- visual parity, design diff, reference-match verification 요청

그 단계는:

- 저장소 내부 capture, diff, report 산출물을 요구한다.
- 비교 전용으로 유지하고 제품 코드 수정을 숨기지 않는다.
- 불일치가 추가 UI 작업을 만들 수 있으면 report를 소비하는 이후 `frontend-developer` 수정 단계를 둔다.

Figma URL 기준에는 `visual-comparator`를 쓰지 않는다. Figma URL 완료 판정은 별도 `figma-parity-auditor` 단계가 소유한다.

## `figma-parity-auditor`

계획이 Figma URL 기준에 맞춰 UI를 바꾸고, 완료 판정이 해당 Figma node와의 parity에 의존하면 이후 `figma-parity-auditor` 단계를 추가한다.

예:

- visual acceptance target으로 쓰는 Figma design URL
- Figma parity, design token verification, Figma-to-code audit 요청
- pixel percentage보다 Figma의 component mapping, token, typography, spacing, effect에 의존하는 리뷰 계약

그 단계는:

- 저장소 내부 parity report 산출물을 요구한다.
- 비교 전용으로 유지하고 제품 코드 수정을 숨기지 않는다.
- 불일치가 추가 UI 작업을 만들 수 있으면 report를 소비하는 이후 `frontend-developer` 수정 단계를 둔다.

## Coverage 경계 규칙

- bounded-surface E2E 소유권은 `plans/`가 아니라 소스 트리에 둔다.
- 선택된 plan coverage를 이후 pass로 조용히 미루지 않는다.
- 선택된 cross-route journey, auth/session transition, redirect chain, persisted browser 상태, release-critical flow는 기존 runner가 소유할 수 있으면 직접 `plan-materialize` coverage로 취급한다.
- reference-based visual comparison이나 Figma parity audit를 암묵적인 frontend polish로 취급하지 않는다. 기준이 acceptance의 일부라면 올바른 검증 단계를 명시적으로 계획한다.

## 관련 문서
- 적용 단계: [[wiki/tags/stage/architect|stage: architect]], [[wiki/tags/stage/review|stage: review]]
""",
    "quality-gates.md": """---
doc_type: core
title: "품질 게이트"
summary: "계획 완료 전에 확인해야 하는 self-review와 검증 기준을 정한다."
---

# 품질 게이트

## 개요
계획 완료 전에 확인해야 하는 self-review와 검증 기준을 정한다.

## 필수 확인

1. registry, 단계별 코어 문서, 적용 가능한 패턴을 실제로 읽었다.
2. 사용자 요청의 포함 범위, 제외 범위, 완료 조건이 `plan.md`에 보인다.
3. `blocking` 결정이 계획 밖에 남아 있지 않다.
4. plan 수와 단계 경계가 독립 검토, rollback, 검증 명령 기준으로 설명된다.
5. 바뀌는 공개 표면, 입력, 출력, 소유권, no-op 규칙이 필요한 만큼 잠겨 있다.
6. 동작을 바꾸는 단계는 시나리오, 입력, 출력, 부정 출력, 소유자를 단계 상세 문서에 적는다.
7. `plan.md`와 단계 상세 문서의 단계 이름, 경계, 완료 신호가 서로 일치한다.
8. 단계 상세 문서가 나중의 `plan-materialize`가 테스트를 도출할 만큼 구체적이다.
9. 검증은 실행 가능한 명령, test, compare, inspection 중 하나로 연결된다.
10. 외부 시각 기준이나 Figma 기준이 acceptance라면 별도 비교 단계를 계획한다.

## 실패 처리

- 위 항목 중 하나가 계획 실행 가능성을 바꾸면 계획을 완료하지 않는다.
- 단순 표현 문제만 남고 실행 계약이 명확하면 finding으로 남기되 blocker로 만들지 않는다.
- self-review에서 발견한 치명적 문제는 사용자에게 넘기기 전에 계획에 반영한다.

## 관련 문서
- 적용 단계: [[wiki/tags/stage/architect|stage: architect]], [[wiki/tags/stage/review|stage: review]]
""",
    "execution-handoff.md": """---
doc_type: core
title: "실행 핸드오프"
summary: "승인된 계획을 실행 단계로 넘길 때 필요한 요약과 인계 기준을 정한다."
---

# 실행 핸드오프

## 개요
승인된 계획을 실행 단계로 넘길 때 필요한 요약과 인계 기준을 정한다.

## 단일 계획 출력

아래를 제공한다.

- 실행 계획 경로
- 단계 상세 문서 디렉터리 경로
- task branch 이름
- 일치하는 worktree 디렉터리 이름
- 첫 실행 단계와 그 `owner_agent`

## 여러 계획 출력

아래를 제공한다.

- 순서가 있는 실행 계획 경로 목록
- plan마다:
  - 단계 상세 문서 디렉터리 경로
  - task branch 이름
  - 일치하는 worktree 디렉터리 이름
  - 첫 실행 단계의 `owner_agent`
  - 주요 검증 경계

## 실행 규칙

- 사용자가 독립 사전 리뷰를 원하면 구현 전에 `plan-reviewer`를 호출한다.
- plan에 구현 범위가 있으면 구현 전에 `plan-materializer`를 실행한다.
- `planner`는 task worktree와 phase-worker dispatch를 소유한다.
- 단계 worker는 nested worktree를 만들지 않고 assigned task worktree 안에서 실행한다.
- 성공한 단계는 task branch 안에서 commit된다.
- final merge는 해당 실행 계획 파일의 `Branch`로 `--no-ff` merge한다.

## 추가 필수 note

- 계획이 구현 범위를 포함하는지, 아니면 docs-only, analysis-only, structural-only인지 밝힌다.
- `plan-materialize`가 bounded-surface coverage만 만들지 선택된 full-flow journey coverage도 만들지 밝힌다.
- 구현 plan에서는 실행 계획 옆 future helper report path를 적는다.
  - `plans/{task-slug}/materialize.md`
  - 또는 `plans/{task-group}-{nn}-{slice-slug}/materialize.md`

## 관련 문서
- 적용 단계: [[wiki/tags/stage/architect|stage: architect]], [[wiki/tags/stage/review|stage: review]]
""",
}


def main() -> None:
    if not CORE.exists():
        raise SystemExit(f"missing core root: {CORE}")
    for name, content in DOCS.items():
        (CORE / name).write_text(content.rstrip() + "\n", encoding="utf-8", newline="\n")
    print(f"rewrote {len(DOCS)} core docs")


if __name__ == "__main__":
    main()
