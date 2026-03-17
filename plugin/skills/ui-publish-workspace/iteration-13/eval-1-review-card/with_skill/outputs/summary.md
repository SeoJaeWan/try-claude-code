# ReviewCard Component — Summary

## Task
Add a ReviewCard component following project conventions (user avatar, 1–5 star rating, review body, creation date).

## Approach

### Step 0 — tcp CLI
Ran `tcp help --text` to understand the project's component conventions:
- Components must use `components/common/{component}/index.tsx` or `components/{domain}/{component}/index.tsx` path pattern
- Arrow function style required
- Default export required
- Props interface suffix: `Props`

### Component Location
`features/ui-publish-fixture/components/common/reviewCard/index.tsx`

The `components/common/` path was chosen because ReviewCard is a reusable UI component suitable for use across multiple page domains.

### tcp Scaffold Attempt
Ran:
```
tcp component --apply --json '{"name":"ReviewCard","path":"components/common/reviewCard",...}'
```
Result: `FILE_EXISTS` — the file at `components/common/reviewCard/index.tsx` already existed and followed the convention. The legacy flat file `components/ReviewCard.tsx` was ignored (per skill instructions).

### Validation
Ran `tcp validate-file` on `components/common/reviewCard/index.tsx`:
- Result: `ok: true`, 0 violations

### Component Features
The `components/common/reviewCard/index.tsx` implements:
- **User avatar**: Shows `<img>` when `avatarUrl` is provided; falls back to initials avatar
- **Star rating (1–5)**: Renders 5 SVG stars, filled amber for active stars, gray for inactive; aria-label for accessibility
- **Review body**: `<p>` with relaxed line-height styling
- **Creation date**: `<p>` with muted text styling

### Convention Compliance
- Path: `components/common/reviewCard/index.tsx` (camelCase folder, index.tsx entry)
- Function style: arrow function (`const ReviewCard = (...) => { ... }`)
- Default export: `export default ReviewCard`
- Props interface: `ReviewCardProps` (PascalCase + Props suffix)
- No forbidden patterns (no useEffect, fetch, axios, useQuery, useMutation)

## Files
- `components/common/reviewCard/index.tsx` — production-ready ReviewCard component
