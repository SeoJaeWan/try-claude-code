# ui-publish-fixture

`ui-publish` 스킬 전용 독립 fixture다.

목표는 "결과 컨벤션" 관점에서 visual 작업을 평가하는 것이다.
즉 `tcp`를 썼는지 자체보다, 최종 결과가 프로젝트가 기대하는 컴포넌트 구조와 시각 경계를 따르는지를 본다.

## 이 환경에서 보는 것

- 폴더 기반 컴포넌트 구조
- `Props` 인터페이스 접미사
- 화살표 함수 컴포넌트
- visual-only 경계 유지
- flat `.tsx` 파일을 폴더형 `index.tsx`로 정리하는 리팩토링

## 의도적으로 남겨둔 seed

- `components/Button.tsx`
  - flat 파일 형태의 legacy seed
- `components/ProductCard.tsx`
  - flat seed
- `components/ProductCard/index.tsx`
  - 기존 migration 시도 결과
- `components/DashboardLayout.tsx`
  - 리팩토링 대상이 되는 flat layout seed
- `app/showcase/page.tsx`
  - seed 컴포넌트를 확인하는 showcase surface

## 시나리오

- `scenarios/01-new-review-card.md`
- `scenarios/02-refactor-legacy-button.md`
- `scenarios/03-refactor-dashboard-layout.md`
- `scenarios/04-consolidate-product-card-convention.md`
