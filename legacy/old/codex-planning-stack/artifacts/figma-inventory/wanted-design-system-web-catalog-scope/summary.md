# Wanted Design System 웹 카탈로그 범위 snapshot

## 출처

- `fileKey`: `ZDmoC6xJxG2FCWIAZLmaWg`
- Figma URL: `https://www.figma.com/design/ZDmoC6xJxG2FCWIAZLmaWg/Wanted-Design-System--Community-?node-id=0-1&p=f&t=E5ngG7Y83Cuy54BS-0`
- 생성 시각: `2026-05-17T21:51:15.4360031+09:00`
- 산출물 성격: 범위 파악용 names-only/direct-children snapshot

## 읽은 root

| root | node id | 상태 | snapshot |
| --- | --- | --- | --- |
| Overview | `0:1` | `partial_names_only` | `snapshots/0-1-overview-scope.json` |
| 2 Element | `16222:137704` | `partial_names_only` | `snapshots/16222-137704-element-scope.json` |
| 3 Component | `16222:137705` | `partial_names_only` | `snapshots/16222-137705-component-scope.json` |
| Resource | `1173:12995` | `partial_names_only` | `snapshots/1173-12995-resource-scope.json` |

## 제외 root

| root | node id | 이유 |
| --- | --- | --- |
| 1 Theme | `16222:137703` | 사용자가 Icon과 Logo를 초기 웹 카탈로그 범위에서 제외함 |

## 1차 카탈로그 수량

| 영역 | 대분류 수 | 항목 수 | 항목 |
| --- | ---: | ---: | --- |
| Element | 3 | 4 | Ratio, Safe Area, Gradient, Interaction |
| Component | 8 | 30 | Essential, Divider, Action Area, Button, Text Button, Icon Button, Chip, Toggle Icon, Textinput, Select, Control, Segmented Control, Framed Style, Icon, Content Badge, Thumbnail, Avatar, List Cell, Card, Loading, Skeleton, Tab, Category, Page Indicator, Pagination, Toast, Snackbar, Alert, Tooltip, Menu |
| Resource | 1 | 2 | Badge, Inspect |

## 주의할 범위

- `Content > Icon`은 `3 Component` 안에서 발견된 항목이다. 사용자가 제외한 Icon이 `1 Theme > Icon`만 뜻하는지, 이 항목까지 제외하는지 후속 확인이 필요하다.
- 이 snapshot은 전체 구현 기준선이 아니다. 정확한 variant 축, token 값, padding, radius, state, component-set leaf 목록은 별도 exact snapshot으로 보강해야 한다.
- `3 Component` 전체 page metadata는 이전 호출에서 transport 제한으로 잘렸으므로, 이번 snapshot은 read-only Figma script의 direct-children 결과를 기준으로 작성했다.

## 다음 조치

1. `Content > Icon` 포함 여부를 확정한다.
2. `shard-plan.json`의 shard 단위로 exact metadata를 수집한다.
3. exact snapshot을 기반으로 웹 카탈로그 route, 데이터 schema, 문서 UI 범위를 계획한다.
