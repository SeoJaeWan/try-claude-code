# Wanted Design System 계획 전 추출 snapshot

## 출처

- `fileKey`: `ZDmoC6xJxG2FCWIAZLmaWg`
- 생성 시각: `2026-05-18T10:44:22.6570254+09:00`
- 범위 기준: `../wanted-design-system-web-catalog-scope/manifest.json`
- 제외: `1 Theme`의 Icon/Logo, `3 Component > 2 Action > Icon Button`, `3 Component > 2 Action > Toggle Icon`, `3 Component > 4 Content > Icon`

## 추출한 것

| 영역 | 추출 내용 | 산출물 |
| --- | --- | --- |
| Variables/styles | collection 수, variable 수, style 수, Component/Frame exact 값 | `snapshots/tokens-summary.json` |
| Variables exact | Component, Frame, Theme, Atomic 전체 271개 exact 값 | `snapshots/variables-exact-values-index.json`, `snapshots/variables-*.json` |
| Styles exact | typography 57개, effect 7개, grid 5개 exact 값 | `snapshots/styles-text-effect-grid-exact.json` |
| Element | Ratio, Safe Area, Gradient, Interaction의 variant 축과 component set | `snapshots/catalog-variant-extract.json` |
| Component | 30개 항목의 variant 축, component set ID, leaf 수, resource 후보 | `snapshots/catalog-variant-extract.json` |
| Component set coverage | 62개 component set / 718 leaf coverage, incomplete 조합 보강 | `snapshots/component-set-coverage-audit.json`, `snapshots/component-set-incomplete-leaves.json` |
| Resource | Badge, Inspect의 variant 축과 component set | `snapshots/catalog-variant-extract.json` |
| Planning overrides | 초기 웹 카탈로그 제외 대상 | `snapshots/planning-overrides.json` |

## Token 기준

| collection | 수량 | 계획 입력 |
| --- | ---: | --- |
| Component | 6 | card padding, platform, gap, viewport, platform margin |
| Atomic | 207 | primitive color/opacity exact 값 고정 |
| Theme | 55 | semantic color exact 값과 Light/Dark alias 고정 |
| Frame | 3 | Radius, Padding/Horizontal, Padding/Vertical exact 값 |

## Style 기준

| style | 수량 | 계획 입력 |
| --- | ---: | --- |
| Text | 57 | font family, weight, size, line-height, letter-spacing exact 값 |
| Effect | 7 | shadow layer, color, offset, radius, spread exact 값 |
| Grid | 5 | column count, gutter, offset, color exact 값 |

## Component 기준

| 영역 | 항목 수 | 비고 |
| --- | ---: | --- |
| Element | 4 | 모두 axes/component set 추출 완료 |
| Component | 30 | Figma 발견 기준 30개, 초기 카탈로그 대상은 Icon Button, Toggle Icon, Content Icon을 제외한 27개 |
| Resource | 2 | Badge, Inspect 추출 완료 |

## Component set coverage 기준

| 항목 | 수량 | 계획 입력 |
| --- | ---: | --- |
| Component set | 62 | `component-set-coverage-audit.json`에서 전체 set coverage 확인 |
| Leaf | 718 | Figma component child 기준 leaf 수 고정 |
| Cartesian complete set | 56 | axis cartesian 조합으로 variant matrix 생성 가능 |
| Incomplete cartesian set | 6 | `component-set-incomplete-leaves.json`의 allowedVariantProps만 허용 |

Incomplete cartesian set: `Divider/Divider`, `Chip/Chip`, `Textinput/Textfield`, `Textinput/Textarea`, `Select/Select`, `Framed Style/Framed Style`.

## 보강된 direct component set

- `Button/Button`: 48 leaf, `Variant`, `Color`, `Size`, `Icon Only`, `Disable`
- `Textinput/Textfield`: 26 leaf, `Status`, `Active`, `Focus`, `Disable`, `Trailing Button`
- `Textinput/Textarea`: 30 leaf, `Status`, `Resize`, `Active`, `Focus`, `Disable`
- `Select/Select`: 30 leaf, `Render`, `Negative`, `Active`, `Focus`, `Disable`, `Overflow`
- `Control/Checkbox`: 48 leaf, `Size`, `State`, `Tight`, `Bold`, `Disable`
- `Segmented Control/Segmented Control`: 12 leaf, `Variant`, `Size`, `Icon`
- `Avatar/Avatar`: 30 leaf, `Variant`, `Size`, `Placeholder`
- `List Cell/List Cell`: 128 leaf, `Vertical Padding`, `Vertical Align`, `Fill Width`, `Text Ellipsis`, `Selected`, `Disable`
- `Menu/Menu`: 6 leaf, `Variant`, `Cell Padding`
- `Menu/Resource/Item/Cell`: 48 leaf, `Variant`, `Vertical Padding`, `Active`, `Caption`, `Disable`

## 남은 주의점

- `Icon Button`, `Toggle Icon`, `Content > Icon`은 Component 페이지에서 발견됐지만, 사용자가 아이콘류 전체를 초기 웹 카탈로그에서 제외하기로 결정했다. Figma inventory에는 증거로 유지하고 plan/구현 데이터에서 제외한다.
- `Button/Button`의 `Icon Only=True`, `Segmented Control`의 `Icon=True`, `Textinput`/`Select`의 Icon 계열 axis 값도 초기 variant/resource 후보에서 제외한다.
- `Atomic` primitive 207개와 `Theme` 55개 semantic color는 exact snapshot으로 보강했다.
- Paint style 250개는 별도 exact paint style snapshot을 만들지 않았다. 계획에서는 color source of truth를 Figma variables로 두고, paint style은 `tokens-summary.json`의 수량/그룹 증거로만 소비하는 편이 안전하다.

## 결과

result = wrote_snapshot  
task_slug = wanted-design-system-web-catalog-extract  
manifest_path = ./.codex/artifacts/figma-inventory/wanted-design-system-web-catalog-extract/manifest.json
