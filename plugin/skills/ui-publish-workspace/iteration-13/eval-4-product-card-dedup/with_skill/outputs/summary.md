# Summary: ProductCard 컨벤션 통합

## 발견된 구조 문제

### ReviewCard 중복
- `components/ReviewCard.tsx` - flat 파일 방식, `export default function` 문법 (legacy)
- `components/common/reviewCard/index.tsx` - folder/index 방식, `const` + `export default` 문법 (정식)
- 두 파일은 동일한 props(`ReviewCardProps`)와 동일한 시각 결과물을 가짐
- `app/showcase/page.tsx`는 `@/components/common/reviewCard`만 import (flat 파일은 미사용)

### ProductCard 상태
- `components/common/productCard/index.tsx` - 이미 folder/index 방식으로만 존재 (중복 없음)
- `app/showcase/page.tsx`에서 import되지 않아 ProductCard 섹션이 없었음

## tcp validate-file 결과

실행 전 두 canonical 파일 모두 `ok: true`, violations 없음 확인.
변경 후 `components/common/productCard/index.tsx`, `components/common/reviewCard/index.tsx`, `app/showcase/page.tsx` 모두 `ok: true`.

## 적용한 변경

### 1. 중복 제거
- `components/ReviewCard.tsx` 삭제 (flat legacy, 미사용 중복 구현)
- `components/common/reviewCard/index.tsx` 유지 (canonical source of truth)

### 2. Showcase 페이지 업데이트
- `app/showcase/page.tsx`에 `ProductCard` import 추가 (`@/components/common/productCard`)
- Showcase에 ProductCard 섹션 추가 (3개 카드 예시: badge 있는 것 2개, 없는 것 1개)
- hover, image, badge, price shell 등 visual affordance 모두 유지

## 최종 컨벤션

| 컴포넌트 | 경로 | 방식 |
|---|---|---|
| `ProductCard` | `components/common/productCard/index.tsx` | folder/index |
| `ReviewCard` | `components/common/reviewCard/index.tsx` | folder/index |

## Import 경로
```tsx
import ProductCard from "@/components/common/productCard";
import ReviewCard from "@/components/common/reviewCard";
```

## 수정된 파일
- 삭제: `features/ui-publish-fixture/components/ReviewCard.tsx`
- 수정: `features/ui-publish-fixture/app/showcase/page.tsx` (ProductCard import 및 섹션 추가)
- 유지: `features/ui-publish-fixture/components/common/productCard/index.tsx`
- 유지: `features/ui-publish-fixture/components/common/reviewCard/index.tsx`
