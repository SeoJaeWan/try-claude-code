# Plan 입력 충분성 점검

## 판정

status = sufficient_for_architect_plan_input

현재 산출물은 구현자가 작업 단계에서 Figma MCP를 다시 열지 않고도 웹 카탈로그의 데이터 계약, route 계약, variant matrix 정책, token/style 화면 범위, 제외 규칙을 계획할 수 있는 수준이다.

## 점검 전 부족했던 부분

| 부족 항목 | 이유 | 보강 결과 |
| --- | --- | --- |
| Atomic/Theme exact token 값 | 기존 `tokens-summary.json`은 수량/그룹 중심이었다 | `variables-*.json`으로 271개 variable exact 값 고정 |
| Typography/effect/grid exact 값 | 기존 snapshot은 style count만 있었다 | `styles-text-effect-grid-exact.json`으로 57/7/5개 exact 값 고정 |
| Component set별 variant 조합 신뢰도 | 기존 snapshot은 axes와 leafCount 중심이라 invalid 조합 위험이 있었다 | `component-set-coverage-audit.json`과 `component-set-incomplete-leaves.json`으로 coverage 보강 |

## 새로 고정한 plan 입력

| 입력 | 상태 | 산출물 |
| --- | --- | --- |
| Variable chunk index | complete | `snapshots/variables-exact-values-index.json` |
| Component/Frame variables | complete | `snapshots/variables-component-frame.json` |
| Theme variables | complete | `snapshots/variables-theme.json` |
| Atomic variables | complete | `snapshots/variables-atomic-*.json` |
| Text/effect/grid styles | complete | `snapshots/styles-text-effect-grid-exact.json` |
| Component set coverage | complete | `snapshots/component-set-coverage-audit.json` |
| Incomplete variant allowed leaves | complete | `snapshots/component-set-incomplete-leaves.json` |
| Initial exclusions | complete | `snapshots/planning-overrides.json` |

초기 Component 카탈로그 대상은 Figma 발견 기준 30개 중 아이콘류 3개 항목을 제외한 27개다.

## Component set 정책

- 전체 component set: 62
- 전체 leaf: 718
- axis cartesian 조합으로 표현 가능한 set: 56
- allowedVariantProps만 사용해야 하는 set: 6

AllowedVariantProps 대상:

- `Divider/Divider`
- `Chip/Chip`
- `Textinput/Textfield`
- `Textinput/Textarea`
- `Select/Select`
- `Framed Style/Framed Style`

## Plan에서 고정해야 하는 구현 규칙

- 구현 단계에서는 Figma MCP를 다시 호출하지 않는다.
- `manifest.json`과 이 audit에 등록된 snapshot만 Figma source of truth로 사용한다.
- `Icon Button`, `Content > Icon`, `Toggle Icon`은 Figma inventory에는 남기되 초기 웹 카탈로그 route/data/render 대상에서 제외한다.
- `Button/Button`의 `Icon Only=True`, `Segmented Control`의 `Icon=True`, `Textinput`/`Select`의 Icon 계열 axis 값도 초기 variant/resource 후보에서 제외한다.
- color 화면의 source of truth는 Figma variables로 둔다.
- paint style 250개는 exact 값을 별도로 쓰지 않고, `tokens-summary.json`의 수량/그룹 증거로만 소비한다.
- incomplete cartesian set 6개는 axes product를 생성하지 않고 `allowedVariantProps`만 variant matrix에 사용한다.

## 남은 비차단 결정

- 없음. 아이콘류 전체 제외가 사용자 결정으로 고정됐다.
