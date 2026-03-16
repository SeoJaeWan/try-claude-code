# Transcript: eval-4-product-card-dedup (with_skill)

## Task

`ProductCard 관련 구조가 섞여 있는데 프로젝트 컨벤션에 맞게 하나로 정리해줘. 시각 동작은 유지하고 중복 구현은 제거해줘.`

## Analysis

Two duplicate `ProductCard` implementations existed:

### `components/ProductCard.tsx` (flat-file, simpler)
- Props: `imageUrl`, `name`, `price`, `currency`
- Fixed `h-48` image container
- No hover animation
- No badge, no testId

### `components/ProductCard/index.tsx` (folder/index, richer)
- Props: `imageUrl`, `imageAlt`, `name`, `price`, `currency`, `badge`, `testId`
- `aspect-square` image with `group-hover:scale-105` zoom animation
- Shadow transition: `hover:shadow-md`
- Badge overlay support
- `data-testid` support

## Decision

Project convention (per skill guide) is **flat-file**: `ComponentName.tsx` with `export default function` pattern.

The folder/index pattern (`ProductCard/index.tsx`) is the richer version with all visual affordances. The consolidation:
1. Updated `components/ProductCard.tsx` to include all props and visual features from the folder version
2. Removed `components/ProductCard/` folder entirely

## Changes Made

### Modified
- `components/ProductCard.tsx` — merged all props and visual features from `ProductCard/index.tsx`

### Deleted
- `components/ProductCard/index.tsx` (and folder) — removed as duplicate

## Result

Single source of truth at `components/ProductCard.tsx` with:
- Full props: `imageUrl`, `imageAlt`, `name`, `price`, `currency`, `badge`, `testId`
- Hover image zoom: `group-hover:scale-105`
- Shadow transition: `transition-shadow hover:shadow-md`
- Badge overlay
- `data-testid` support
- `export default function` pattern (project convention)

## Typecheck

Pre-existing errors in `hooks/apis/queries/useFetchOrder/__tests__/` and `playwright.config.ts` are unrelated to this change. `components/ProductCard.tsx` has zero type errors.

## Lint

Pre-existing `react-hooks/set-state-in-effect` errors in other files. `components/ProductCard.tsx` is lint-clean.
