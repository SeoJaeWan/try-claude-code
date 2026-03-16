# Transcript: eval-4-product-card-dedup

## Task
Consolidate duplicate ProductCard implementations into a single source of truth following project conventions.

## Steps Taken

### 1. Read context files
- `features/ui-publish-fixture/package.json` — Next.js 16, React 19, Tailwind 4, TypeScript 5
- `features/ui-publish-fixture/components/ProductCard.tsx` — flat file, simpler implementation
- `features/ui-publish-fixture/components/ProductCard/index.tsx` — folder-based, richer implementation

### 2. Analyzed both implementations

**`components/ProductCard.tsx` (flat file):**
- Props: `imageUrl`, `name`, `price`, `currency?`
- Image: fixed `h-48` height
- No hover effects
- No badge or testId support

**`components/ProductCard/index.tsx` (folder-based):**
- Props: `imageUrl`, `imageAlt?`, `name`, `price`, `currency?`, `badge?`, `testId?`
- Image: `aspect-square` responsive
- Hover effects: shadow transition + image scale (`group-hover:scale-105`)
- Badge overlay support
- `data-testid` support
- `ko-KR` locale price formatting
- Richer responsive `sizes` attribute

### 3. Decision: folder-based structure is the project convention

The scenario file confirmed: flat/file and folder/index must not coexist. The folder structure (`ComponentName/index.tsx`) is the standard convention. The folder version was a superset of the flat version in both props and visual features.

### 4. Removed flat `components/ProductCard.tsx`

```bash
rm "features/ui-publish-fixture/components/ProductCard.tsx"
```

### 5. Recreated `components/ProductCard/index.tsx`

Created the canonical folder-based file with the full feature set:
- All props from both implementations (superset)
- Hover shadow: `transition-shadow hover:shadow-md`
- Image hover scale: `group-hover:scale-105 transition-transform duration-300`
- Badge overlay: absolute positioned, blue pill badge
- `data-testid` for testing
- Price: `toLocaleString("ko-KR")`
- Dark mode support throughout
- Responsive image sizes

### 6. Verified no ProductCard type errors

```bash
pnpm exec tsc --noEmit 2>&1 | grep -i productcard
# → No ProductCard type errors
```

## Final State

- Deleted: `components/ProductCard.tsx` (flat duplicate)
- Canonical: `components/ProductCard/index.tsx` (folder convention, full feature set)

## Review Points Satisfied

- Import path is consistent: `from "@/components/ProductCard"` resolves to folder index
- Name `ProductCard`, props `ProductCardProps` maintained
- All visual affordances preserved: hover shadow, image scale, badge, price shell, dark mode
