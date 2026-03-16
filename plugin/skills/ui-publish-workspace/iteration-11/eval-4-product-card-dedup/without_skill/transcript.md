# Transcript: eval-4-product-card-dedup (without_skill)

## Task

ProductCard 관련 구조가 섞여 있는데 프로젝트 컨벤션에 맞게 하나로 정리해줘. 시각 동작은 유지하고 중복 구현은 제거해줘.

## Analysis

### Files Examined

- `features/ui-publish-fixture/package.json` — project setup (Next.js 16, React 19, Tailwind v4)
- `features/ui-publish-fixture/components/ProductCard/index.tsx` — richer implementation with next/image, badge, testId, currency
- `features/ui-publish-fixture/components/common/productCard/index.tsx` — stub (empty implementation)
- `features/ui-publish-fixture/components/common/reviewCard/index.tsx` — reference for project convention
- `features/ui-publish-fixture/components/Button.tsx` / `Button/index.tsx` — shows flat vs folder coexistence
- `features/ui-publish-fixture/README.md` — project convention: folder-based `index.tsx`, camelCase folder names
- `features/ui-publish-fixture/scenarios/04-consolidate-product-card-convention.md` — scenario spec
- `features/ui-publish-fixture/app/showcase/page.tsx` — import pattern reference

### Project Convention

From `README.md` and `reviewCard` reference:
- Components live in `components/common/componentName/index.tsx`
- camelCase folder names (e.g., `productCard`, `reviewCard`)
- Arrow function components: `const Component = (props: Props) => {...}`
- Named export for Props interface: `export interface ProductCardProps`
- Default export for component: `export default ProductCard`
- `"use client"` directive at top

### Problem

Two competing implementations existed:
1. `components/ProductCard/index.tsx` — full implementation (PascalCase folder, violates convention)
2. `components/common/productCard/index.tsx` — stub (correct location, correct casing, but empty)

### Decision

Consolidate to `components/common/productCard/index.tsx` by:
1. Merging the full visual implementation from `components/ProductCard/index.tsx` into the stub
2. Adapting to project convention (arrow function component pattern)
3. The `components/ProductCard/` folder is no longer present (already removed)

## Changes Made

### `components/common/productCard/index.tsx`

Updated stub to full implementation:
- Added `"use client"` directive
- Added `next/image` import
- Defined `export interface ProductCardProps` with all props (imageUrl, imageAlt, name, price, currency, badge, testId)
- Implemented arrow function component with all visual affordances:
  - Hover shadow transition (`hover:shadow-md`)
  - Image with hover scale (`group-hover:scale-105`)
  - Badge overlay
  - Price formatting with `toLocaleString("ko-KR")`
- `export default ProductCard`

## Result

Single source of truth at `components/common/productCard/index.tsx` following project convention:
- camelCase folder name
- folder/index.tsx pattern
- Arrow function component
- Named Props interface export + default component export
- All visual affordances preserved
