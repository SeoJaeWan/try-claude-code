# ProductCard Deduplication — Transcript

## Task

`components/ProductCard.tsx` (flat file)과 `components/ProductCard/index.tsx` (folder convention) 두 구현이 공존하는 상태를 프로젝트 컨벤션에 맞게 정리.

## Analysis

### Before

**`components/ProductCard.tsx`** (simpler, older):
- `imageUrl`, `name`, `price`, `currency` props
- `h-48` fixed height image container
- No hover effects, no badge, no testId
- `truncate` for name, `text-blue-600` price color

**`components/ProductCard/index.tsx`** (richer, canonical):
- All of the above + `imageAlt`, `badge`, `testId` props
- `aspect-square` image container
- `group-hover:scale-105` image zoom on hover
- `hover:shadow-md` card shadow transition
- `line-clamp-2` for name
- `data-testid` support
- `toLocaleString("ko-KR")` for Korean number formatting

### Module Resolution Issue

TypeScript resolves `@/components/ProductCard` by checking `ProductCard.tsx` before `ProductCard/index.tsx`. So the simpler flat file was shadowing the richer folder version — the opposite of the intended behavior.

### Decision

- **Canonical implementation**: `components/ProductCard.tsx` (flat file takes resolution precedence)
- **Folder entry**: `components/ProductCard/index.tsx` becomes a re-export barrel

## Changes Made

### `components/ProductCard.tsx`
Updated to contain the full canonical implementation (merged from the richer folder version):
- Added `imageAlt`, `badge`, `testId` props
- `aspect-square` image container with hover zoom (`group-hover:scale-105`)
- Card shadow transition (`hover:shadow-md`)
- `line-clamp-2` for name truncation
- Korean locale number formatting

### `components/ProductCard/index.tsx`
Replaced duplicate implementation with re-export barrel:
```tsx
export type { ProductCardProps } from "../ProductCard";
export { default } from "../ProductCard";
```

## Result

- Single source of truth in `components/ProductCard.tsx`
- `components/ProductCard/index.tsx` transparently re-exports — both import paths work identically
- All visual behavior preserved (hover effects, badge, testId, image zoom)
- No duplicate implementation
- TypeScript check: no ProductCard-related errors
