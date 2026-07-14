# Wanted Design System 웹 카탈로그 UI 방향

artifact_status: locked_ui_direction
artifact_path: ./.codex/artifacts/ui-spec/wanted-design-system-web-catalog.md
request_scope_artifact: ./.codex/artifacts/brainstorm/wanted-design-system-web-catalog.md
figma_extract_manifest: ./.codex/artifacts/figma-inventory/wanted-design-system-web-catalog-extract/manifest.json
reference_decision_status: locked

## UI 방향 요약 표

| 대상 영역 | 이번에 고정한 방향 | 산출물 반영 메모 | 남은 미결정 |
| --- | --- | --- | --- |
| 전체 화면 구조 | 조밀한 디자인 시스템 카탈로그. 넓은 화면은 좌측 탐색, 중앙 본문, 우측 목차의 3열 구조로 둔다 | 계획은 문서형 작업 화면을 기준으로 작성한다 | 없음 |
| 첫 화면 | 소개 화면이 아니라 카탈로그 현황 화면으로 시작한다. 토큰, 요소, 컴포넌트, 리소스 수량과 제외 범위를 바로 보여준다 | `sufficiency-audit.md`의 수량을 첫 화면 지표로 사용 | 없음 |
| 토큰 화면 | 의미 토큰, 원시 토큰, 글꼴, 그림자, 격자, 반지름, 안쪽 여백을 표와 시각 샘플로 함께 보여준다 | `variables-*`, `styles-text-effect-grid-exact.json`을 근거로 화면 계약 작성 | 없음 |
| 컴포넌트 화면 | 분류 목록, 상세 화면, 변형 행렬, 허용 조합, 미리보기, 근거 snapshot 정보를 같은 상세 화면 안에 배치한다 | 초기 대상은 Figma 발견 30개 중 아이콘류 3개 제외 후 27개 | 없음 |
| 검색과 필터 | 전역 검색, 영역 필터, 분류 필터, 변형 완전성 필터를 둔다 | 제외 항목은 검색 결과에도 나오지 않아야 한다 | 없음 |
| 아이콘류 제외 | 카탈로그 콘텐츠, route, 검색, 변형 후보에서 아이콘류를 제외한다 | `planning-overrides.json`을 화면 검증 규칙으로 연결 | 없음 |

## 디자인 레퍼런스 결정 표

| 화면 영역 | 주 레퍼런스 | 참고할 부분 | 적용 규칙 | 참고하지 않을 부분 |
| --- | --- | --- | --- | --- |
| 전체 컴포넌트 분류와 탐색 | [Ant Design Components Overview](https://ant.design/components/overview/) | 컴포넌트를 기능별 분류로 묶고, 분류별 항목 수를 보여주는 방식 | `Layout`, `Action`, `Selection and Input`, `Content`, `Loading`, `Navigation`, `Feedback`, `Presentation`을 좌측 탐색과 첫 화면 요약에 반영 | Ant Design의 시각 언어, 아이콘, 제품 브랜딩은 따르지 않음 |
| 토큰 설명과 색상 구조 | [Carbon color overview](https://carbondesignsystem.com/elements/color/overview/) | 색상 토큰을 역할, 테마, 상호작용 상태와 함께 설명하는 방식 | 색상 화면은 원시값만 나열하지 않고 `Light`/`Dark`, alias, 역할, 상태를 함께 보여준다 | IBM 색상 팔레트와 제품 색은 복제하지 않음 |
| 토큰 이름과 사용 의미 | [Atlassian design tokens](https://atlassian.design/foundations/tokens/design-tokens/) | 토큰을 단일 기준값으로 보고, 이름이 사용 의도를 설명하게 하는 방식 | 토큰 표는 이름, 값, alias, 모드, 용도 열을 갖는다. 값이 같아도 의미가 다르면 별도 행으로 유지한다 | Atlassian 토큰 이름을 Wanted 토큰명으로 바꾸지 않음 |
| 변형 조작과 미리보기 | [Storybook Controls](https://storybook.js.org/docs/essentials/controls) | 속성 기반 조작, 속성 설명, 기본값을 미리보기 옆에 두는 방식 | 컴포넌트 상세에는 변형 선택기와 속성 표를 함께 둔다. 불완전 조합은 허용 조합만 선택 가능하게 한다 | Storybook 자체 도구 UI나 story 파일 구조는 만들지 않음 |
| 데이터 기반 등록부 | [Spectrum Design Data](https://opensource.adobe.com/spectrum-design-data/) | 컴포넌트 속성, 토큰, 등록부를 기계가 읽을 수 있는 기준으로 분리하는 방식 | 웹 카탈로그 데이터는 화면용 텍스트와 검증 가능한 등록부를 분리한다 | Adobe 데이터 schema를 그대로 채택하지 않음 |
| 범위와 상태 표기 | [USWDS Component status](https://designsystem.digital.gov/components/status/) | 컴포넌트별 상태를 표로 공개하는 방식 | 첫 화면과 목록에서 포함, 제외, 불완전 조합 보강 같은 상태를 명확히 표시한다 | 생명주기 단계나 제안 절차는 도입하지 않음 |

## 상태/표현 규칙 표

| 상태 또는 상황 | 사용자가 보게 될 것 | 계획에 반영할 규칙 | 비고 |
| --- | --- | --- | --- |
| 첫 진입 | 카탈로그 수량, 기준 snapshot, 제외 범위, 주요 분류가 한 화면에 보인다 | 홍보형 첫 화면과 큰 장식 영역은 만들지 않는다 | 작업형 문서 화면 |
| 검색 결과 없음 | 검색어와 필터 조건을 보여주고 초기화 동작을 제공한다 | 빈 상태는 원인을 보여주고 한 번에 초기화할 수 있어야 한다 | 정적 데이터 기준 |
| 제외 항목 접근 | 상세 route가 없고 검색 결과에도 나오지 않는다 | `Icon Button`, `Content Icon`, `Toggle Icon`과 icon 전용 변형 값은 차단한다 | 아이콘류 전체 제외 |
| 변형 조합 완전 | 축 기반 행렬과 선택 가능한 미리보기를 보여준다 | `cartesianComplete=true`일 때만 축 곱으로 행렬을 만든다 | 56개 set |
| 변형 조합 불완전 | 허용 조합 목록과 선택기만 보여준다 | `allowedVariantProps` 외 조합은 만들지 않는다 | 6개 set |
| 토큰 alias | 실제 값과 참조 대상을 함께 보여준다 | alias는 이름과 최종 값 모두 추적 가능하게 표현한다 | 색상 토큰 핵심 |
| 모바일 화면 | 상단 탐색, 접히는 분류, 가로 스크롤 또는 압축 표를 보여준다 | 우측 목차는 접고 본문과 검색을 우선한다 | 작은 화면 기준 |
| 오류 상태 | 기준 파일 누락 또는 데이터 불일치 항목을 표로 보여준다 | 사용자에게 Figma 재호출을 요구하지 않고 local artifact 문제로 표시한다 | 구현 단계 Figma 호출 금지 |

## 디자인 시스템/제약 표

| 항목 | 이번 결정 | 이유 | 적용 범위 |
| --- | --- | --- | --- |
| 시각 밀도 | 조밀하고 정돈된 운영형 문서 밀도 | 반복 조회와 비교가 핵심이다 | 전체 화면 |
| 배치 | 3열 문서 구조, 본문 최대 폭 제한, 표 중심 구성 | 토큰과 변형 조합을 빠르게 비교해야 한다 | 데스크톱 |
| 장식 | 큰 hero, 홍보형 카드, 장식 배경을 배제한다 | 디자인 시스템 카탈로그 목적과 맞지 않다 | 첫 화면과 상세 화면 |
| 카드 사용 | 개별 항목 묶음에만 사용하고 화면 안에 카드를 중첩하지 않는다 | 표와 목록 중심 가독성을 유지한다 | 전체 화면 |
| 색상 | Figma 변수의 의미 색상을 우선 사용한다 | 카탈로그 자체가 시스템 기준을 따라야 한다 | 토큰, 상태, 강조 |
| 글꼴 | `Pretendard JP` 스타일 값을 우선 기준으로 한다 | Figma text style snapshot과 일치시킨다 | 전체 화면 |
| 아이콘 | 카탈로그 콘텐츠와 주요 조작에서 아이콘을 쓰지 않고 텍스트 라벨 중심으로 둔다 | 아이콘류 전체 제외 결정과 충돌하지 않게 한다 | 탐색, 검색, 버튼 |
| 접근성 | 표 머리글, 키보드 초점, 색상명 병기, 충분한 대비를 요구한다 | 색상과 상태를 시각만으로 전달하지 않기 위함 | 전체 화면 |

## 화면별 레퍼런스 적용 표

| 화면 | 따라야 할 레퍼런스 조합 | 화면 구성 규칙 |
| --- | --- | --- |
| 첫 화면 | Ant Design 분류 구조 + USWDS 상태 표기 | 수량 지표, 분류 목록, 제외 범위, 기준 snapshot 링크를 한 화면에 배치 |
| 토큰 색상 화면 | Carbon 색상 구조 + Atlassian 토큰 의미 | 원시 색상, 의미 색상, `Light`/`Dark`, alias, 상태 토큰을 분리해서 표시 |
| 글꼴/그림자/격자 화면 | Atlassian 토큰 의미 + Spectrum 등록부 관점 | 스타일명, 값, 적용 용도, 미리보기를 표로 제공 |
| 컴포넌트 목록 | Ant Design 분류 구조 + USWDS 상태 표기 | 분류별 27개 초기 대상만 노출하고 제외 항목은 목록에서 숨김 |
| 컴포넌트 상세 | Storybook Controls + Spectrum 등록부 관점 | 변형 선택기, 속성 표, 허용 조합, 미리보기, 근거 snapshot을 한 화면에 제공 |
| 리소스 화면 | Ant Design 분류 구조 | `Badge`, `Inspect/Measure`를 보조 도구 성격으로 분리 표시 |

## 계획에 넘길 UI 계약

| 계약 항목 | 고정 내용 |
| --- | --- |
| 기본 route | `/`, `/foundations/*`, `/elements/*`, `/components/*`, `/resources/*` |
| 첫 화면 지표 | 변수 271개, 글꼴 57개, 효과 7개, 격자 5개, 요소 4개, 초기 컴포넌트 27개, 리소스 2개 |
| 제외 검증 | 아이콘류 route, 검색 결과, 미리보기, 변형 후보가 없어야 한다 |
| 변형 검증 | 완전 조합은 축 곱, 불완전 조합은 `allowedVariantProps`만 사용한다 |
| 미리보기 검토 | 계획 산출물은 첫 화면, 토큰 화면, 컴포넌트 상세 화면, 모바일 화면의 HTML/CSS 미리보기 검토 기준을 포함한다 |

## 남은 질문 / 가정

- 없음. 디자인 레퍼런스는 화면 영역별로 고정됐고, 단일 레퍼런스를 통째로 복제하지 않는다.

## 추천 다음 상태

locked_ui_direction
