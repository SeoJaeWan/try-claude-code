# Wanted Design System 웹 카탈로그 요청 잠금

artifact_status: ready_for_plan_input
artifact_path: ./.codex/artifacts/brainstorm/wanted-design-system-web-catalog.md
scope_inventory_manifest: ./.codex/artifacts/figma-inventory/wanted-design-system-web-catalog-scope/manifest.json
scope_inventory_status: partial_names_only
pre_plan_extract_manifest: ./.codex/artifacts/figma-inventory/wanted-design-system-web-catalog-extract/manifest.json
pre_plan_extract_status: wrote_snapshot
pre_plan_sufficiency_audit: ./.codex/artifacts/figma-inventory/wanted-design-system-web-catalog-extract/sufficiency-audit.md
pre_plan_sufficiency_status: sufficient_for_architect_plan_input
ui_spec_artifact: ./.codex/artifacts/ui-spec/wanted-design-system-web-catalog.md
ui_spec_status: locked_ui_direction

## 요청 대응표

| 사용자 요청 항목 | 이번 결정에서 고정한 내용 | 반영 대상 | 남은 미결정 |
| --- | --- | --- | --- |
| Figma 기반 디자인 시스템을 웹에서 보여주기 | Figma를 최초 기준으로 삼고, 이후 자동 갱신 없이 수동 데이터로 관리한다 | 새 웹 문서 사이트 | 기준선과 exact 추출 완료 |
| variant, token, padding 같은 요소를 보여주기 | variant 행렬, 토큰 표, anatomy 시각화, playground, 사용 기준으로 구성한다 | 문서 화면과 데이터 구조 | plan에서 snapshot별 데이터 계약으로 고정 |
| 전체 카탈로그 선호 | 아이콘류 전체와 logo를 제외한 전체 카탈로그를 목표로 한다 | Overview, Element, Component, Resource | 제외 override를 plan 입력으로 소비 |
| 기술 스택 | `React + Vite + TypeScript`를 기본값으로 둔다 | 새 frontend 앱 | 패키지 매니저와 테스트 명령은 계획 전 확인 필요 |
| icon과 logo 제외 | `1 Theme`의 Icon/Logo 문서화는 초기 범위에서 제외한다 | 문서 route, 데이터, 검증 | 제외된 asset의 후속 처리 없음 |
| icon button 제외 | `3 Component > 2 Action > Icon Button`은 초기 웹 카탈로그에서 제외한다 | 문서 route, 데이터, 검증 | Figma inventory에는 발견 증거로 유지 |
| 아이콘류 전체 제외 | `3 Component > 4 Content > Icon`과 `3 Component > 2 Action > Toggle Icon`도 초기 웹 카탈로그에서 제외하고, icon 전용 variant 값도 필터링한다 | 문서 route, 데이터, 검증 | Figma inventory에는 발견 증거로 유지 |

## 작업 묶음 표

| 작업 묶음 | 이번에 바꾸는 것 | 유지되는 것 | 관련 영역 |
| --- | --- | --- | --- |
| Figma 기준선 | 아이콘류와 logo를 제외한 Element, Component, Resource 계층을 snapshot과 override로 고정 | Figma 원본은 읽기 전용 기준 | Figma 진단 |
| 웹 문서 구조 | 전체 카탈로그형 navigation과 상세 route를 만든다 | 자동 동기화 없음 | frontend |
| 수동 데이터 구조 | tokens, elements, components, resources 데이터를 사람이 편집 가능한 파일로 둔다 | Figma 변경은 수동 반영 | frontend |
| 문서 시각화 | 토큰 표, variant 행렬, anatomy, playground를 공통 UI로 만든다 | 원본 Figma 레이어를 그대로 노출하지 않음 | frontend |
| 검증 | 등록된 카탈로그 항목이 route와 renderer를 갖는지 확인한다 | 픽셀 완전 일치 검증은 초기 범위 제외 | frontend |

## 실행 영역 표

| 실행 영역 | 이번 판단 | 근거 | 제외 또는 포함 이유 |
| --- | --- | --- | --- |
| Figma 진단 | 포함 | Figma가 최초 권위 기준 | 구현 계획 전에 snapshot manifest가 필요 |
| frontend | 포함 | 웹 카탈로그를 새로 만들어야 함 | 저장소에 현재 앱 코드가 없음 |
| backend | 제외 | 정적 문서와 수동 데이터로 충분 | 서버 상태가 필요하지 않음 |
| database | 제외 | 데이터는 파일 기반으로 관리 | 운영 복잡도 감소 |
| Figma 자동 갱신 | 제외 | 사용자가 수동 변경을 원함 | 최초 분석 이후 동기화하지 않음 |
| Icon/Logo 문서화 | 제외 | 사용자가 제외를 선택함 | 초기 전체 카탈로그 범위에서 제외 |
| Icon Button 문서화 | 제외 | 사용자가 제외를 선택함 | 초기 Component 카탈로그 범위에서 제외 |
| Content Icon / Toggle Icon 문서화 | 제외 | 사용자가 아이콘류 전체 제외를 선택함 | 초기 Component 카탈로그 범위에서 제외 |

## 공개 경계 표

| 대상 | 공개 경계 | 상태 소유권 | callback / handoff | 비고 |
| --- | --- | --- | --- | --- |
| 카탈로그 데이터 | token, element, component, resource 항목 | 웹 문서 저장소 | 수동 편집 | Figma 변경 시 사람이 수정 |
| 문서 route | Overview, Foundations, Elements, Components, Resources | frontend 앱 | 없음 | icon/logo route와 아이콘류 Component 상세 route 제외 |
| Playground | 선택된 variant, size, state 같은 로컬 UI 상태 | 각 문서 페이지 | 없음 | 저장이나 서버 연동 없음 |
| Figma 기준선 | manifest와 snapshot 파일 | `.codex/artifacts/figma-inventory/**` | 계획 입력 | 생성 완료 |

## 제외 항목 표

| 항목 | 처리 | 이유 | 사용자 승인 필요 여부 |
| --- | --- | --- | --- |
| Figma 자동 갱신 | 제외 | 수동 반영 방식으로 결정됨 | 아니오 |
| Icon 문서화 | 제외 | 사용자가 제외함 | 아니오 |
| Logo 문서화 | 제외 | 사용자가 제외함 | 아니오 |
| Icon Button 문서화 | 제외 | 사용자가 제외함 | 아니오 |
| Content Icon 문서화 | 제외 | 사용자가 아이콘류 전체 제외를 선택함 | 아니오 |
| Toggle Icon 문서화 | 제외 | 사용자가 아이콘류 전체 제외를 선택함 | 아니오 |
| backend/API | 제외 | 정적 문서 사이트로 충분 | 아니오 |
| database/CMS | 제외 | 초기 운영 방식과 맞지 않음 | 아니오 |
| 픽셀 완전 일치 비교 | 초기 범위 제외 | 문서화 목적이 우선 | 예 |

## 진단 기준선 표

| 조사 경계 | 권위 기준 | 현재 확인 대상 | 확인한 증거 | 남은 공백 |
| --- | --- | --- | --- | --- |
| Figma 최상위 페이지 | `ZDmoC6xJxG2FCWIAZLmaWg` | Overview, 1 Theme, 2 Element, 3 Component, Resource | Figma metadata와 scope snapshot에서 최상위 페이지 확인 | 없음 |
| 2 Element | Figma snapshot | Basic, Spacing, Decorate | Ratio, Safe Area, Gradient, Interaction의 axes/component set 확인 | 없음 |
| 3 Component | Figma snapshot | Layout, Action, Selection and Input, Content, Loading, Navigation, Feedback, Presentation | 30개 항목, 62개 component set, 718 leaf coverage 확인. 초기 카탈로그 대상은 아이콘류 3개 항목 제외 후 27개 | 없음 |
| Resource | Figma snapshot | Badge, Inspect/Measure | Badge Status/Value, Inspect Measure 확인 | 없음 |
| 1 Theme | Figma metadata | Icon, Logo | 대형 Icon 목록과 Logo 계열 확인 | 초기 범위에서 제외 |
| 웹 카탈로그 범위 snapshot | `.codex/artifacts/figma-inventory/wanted-design-system-web-catalog-scope/manifest.json` | Overview, 2 Element, 3 Component, Resource | names-only/direct-children 기준으로 1차 범위 고정 | 없음 |
| 계획 전 exact 추출 | `.codex/artifacts/figma-inventory/wanted-design-system-web-catalog-extract/manifest.json` | variables, styles, component set coverage | exact token/style 값과 variant coverage 보강 완료 | 없음 |

## planning-ready 판정표

| 상태 | 항목 | 판단 | 다음 조치 |
| --- | --- | --- | --- |
| ready | Figma 범위 기준선 | 범위 snapshot과 계획 전 추출 snapshot이 있음 | plan은 두 manifest를 authoritative input으로 소비 |
| ready | Figma exact 추출 | 271개 variable, text/effect/grid style, 62개 component set coverage를 보강함 | 작업 단계에서는 Figma MCP를 다시 호출하지 않도록 plan에 고정 |
| ready | 자동 갱신 제외 | 사용자가 수동 변경 방식을 선택 | 계획에 제외 항목으로 고정 |
| ready | 기술 스택 | `React + Vite + TypeScript` 기본값 수용 | 계획 전 package manager만 확인 |
| ready | Icon/Logo 제외 | 사용자가 제외 선택 | route와 데이터에서 제외 |
| ready | Icon Button 제외 | 사용자가 제외 선택 | `3 Component > 2 Action > Icon Button`을 route와 데이터에서 제외 |
| ready | 아이콘류 전체 제외 | 사용자가 제외 선택 | `3 Component > 4 Content > Icon`, `3 Component > 2 Action > Toggle Icon`은 route/data에서 제외하고, icon 전용 variant 값은 matrix/resource 후보에서 제외 |
| ready | UI 방향 | 화면 영역별 디자인 레퍼런스와 적용 규칙을 고정함 | plan은 `ui_spec_artifact`를 화면 계약 입력으로 소비 |
| derivable | 검증 명령 | 저장소에 앱이 아직 없으므로 생성 후 결정 가능 | 계획에서 초기 명령을 잠근다 |

## 남은 질문 / 가정

- "천체 카탈로그"는 문맥상 "전체 카탈로그"로 해석했다.
- 전체 카탈로그는 아이콘류 전체와 logo를 제외한 Figma의 Element, Component, Resource 중심 카탈로그를 뜻한다.
- Component 전체 목록은 계획 전 추출 snapshot과 제외 override를 함께 소비한다.

## 추천 다음 상태

ready_for_plan_input
