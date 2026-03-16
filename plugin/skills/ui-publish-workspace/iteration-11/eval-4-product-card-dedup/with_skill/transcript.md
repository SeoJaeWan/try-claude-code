# Transcript: eval-4-product-card-dedup

## Task

ProductCard 관련 구조가 섞여 있는데 프로젝트 컨벤션에 맞게 하나로 정리해줘. 시각 동작은 유지하고 중복 구현은 제거해줘.

## Analysis

### Problem

Two conflicting ProductCard implementations existed:

1. `components/ProductCard/index.tsx` - folder-style at wrong path, uses `function` declaration (not arrow), good visual implementation
2. `components/common/productCard/` - correct convention path (empty folder, no implementation)

The project convention (from `tcp help --text`) requires:
- Path: `components/common/{component}/index.tsx` for shared components
- Arrow function component (not `function` declaration)
- Named export for `*Props` interface, default export for component
- camelCase folder segments

### Decision

Use `components/common/productCard/index.tsx` as the single source of truth. Migrate the full visual implementation from `components/ProductCard/index.tsx`, converting to arrow function style per project convention. Remove the legacy `components/ProductCard/` folder entirely.

## Steps Taken

1. Read SKILL.md to understand the workflow
2. Read context files: `components/ProductCard/index.tsx` and `components/common/productCard/` (empty)
3. Read scenario file to confirm expected outcome
4. Ran `tcp help --text` to learn component path policy and file rules
5. Scaffolded boilerplate: `tcp component --json '{"name":"ProductCard","path":"components/common/productCard"}' --apply`
6. Filled in the visual implementation (image, badge, name, price, hover effects) as arrow function
7. Removed legacy files: `components/ProductCard/index.tsx` and `components/ProductCard/` folder
8. Ran `tcp validate-file components/common/productCard/index.tsx` - passed (0 violations)
9. Ran `pnpm exec tsc --noEmit` - no errors in ProductCard component (pre-existing unrelated errors in test files)
10. Ran `pnpm lint --fix` - no errors in ProductCard component (pre-existing errors in other files)

## Result

### Deleted

- `components/ProductCard/index.tsx`
- `components/ProductCard/` (directory)

### Created

- `components/common/productCard/index.tsx` — single source of truth, arrow function, correct convention path

### Visual Behavior Preserved

- Aspect-square image with `object-cover` and hover scale animation (`group-hover:scale-105`)
- Optional badge (top-left, blue pill)
- Product name with `line-clamp-2`
- Price with `ko-KR` locale formatting and currency prefix
- Card shadow transition on hover
- Dark mode support throughout

### Convention Compliance

- Path: `components/common/productCard/index.tsx`
- Arrow function component
- `ProductCardProps` named export
- `ProductCard` default export
- `tcp validate-file`: 0 violations
