# Transcript: eval-4-product-card-dedup (with_skill)

## Task

ProductCard 관련 구조가 섞여 있는데 프로젝트 컨벤션에 맞게 하나로 정리해줘. 시각 동작은 유지하고 중복 구현은 제거해줘.

## Analysis

두 개의 중복된 `ProductCard` 구현이 존재했다:

1. `components/ProductCard.tsx` (flat file)
   - Props: imageUrl, name, price, currency
   - 특징: rounded-xl, h-48 고정 높이, truncate, simple

2. `components/ProductCard/index.tsx` (folder/index pattern)
   - Props: imageUrl, imageAlt, name, price, currency, badge, testId
   - 특징: rounded-2xl, aspect-square, group hover scale, shadow, badge, data-testid

## Convention Decision

프로젝트의 다른 컴포넌트를 확인:
- `components/Button/index.tsx` → folder/index 패턴
- `components/DashboardLayout/` → folder/index 패턴

folder/index 패턴이 프로젝트 컨벤션이다.

## Action Taken

- `components/ProductCard.tsx` 삭제 (flat file, 기능이 더 적은 버전)
- `components/ProductCard/index.tsx` 유지 (folder/index 컨벤션, 더 풍부한 시각 구현)

`ProductCard/index.tsx`는 flat 버전의 모든 시각 요소를 포함하며 추가로:
- hover scale 애니메이션 (`group-hover:scale-105`)
- shadow transition (`hover:shadow-md`)
- badge 지원
- `imageAlt` 별도 prop
- `testId` (data-testid) 지원
- aspect-square 이미지 (h-48 고정 대비 더 반응형)
- `line-clamp-2` (truncate 대비 멀티라인 지원)
- ko-KR locale 포맷

## Result

- 단일 source of truth: `components/ProductCard/index.tsx`
- `ProductCard.tsx` flat file 제거됨
- 컴포넌트명 `ProductCard`, props명 `ProductCardProps` 유지
- 모든 시각 affordance 보존 (이미지, hover, 가격 표시)
- import path 일관성: `@/components/ProductCard` 또는 `../components/ProductCard`

## Files Modified

- DELETED: `components/ProductCard.tsx`
- KEPT: `components/ProductCard/index.tsx`
