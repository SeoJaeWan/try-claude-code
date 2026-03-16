# Transcript: ReviewCard Component (eval-1-review-card, with_skill)

## Task
ReviewCard 컴포넌트를 프로젝트 컨벤션에 맞게 추가. 사용자 아바타, 별점(1~5), 리뷰 본문, 작성일 포함.

## Steps

### 1. Read context files
- `package.json` - Next.js 16, React 19, Tailwind CSS 4, TypeScript
- `app/showcase/page.tsx` - showcase page already importing ReviewCard from flat path
- `app/globals.css` - CSS variables, zinc/background/foreground tokens
- `components/EmptyState.tsx` - existing component pattern reference

### 2. Run tcp --help
Confirmed tcp CLI available with commands: component, validateFile, batch, etc.

### 3. Inspect existing components
Found `components/ReviewCard.tsx` as a legacy flat file. Per tcp skill rules, must migrate to directory-based pattern: `components/common/reviewCard/index.tsx`.

### 4. Run tcp component scaffold
```
tcp component --json '{"name":"ReviewCard","path":"components/common/reviewCard"}' --apply
```
Generated: `components/common/reviewCard/index.tsx` (scaffold)

### 5. Implement ReviewCard
Wrote full implementation to `components/common/reviewCard/index.tsx`:
- Props: `avatarUrl?`, `authorName`, `rating (1|2|3|4|5)`, `body`, `createdAt`
- Avatar: image or initials fallback
- Star rating with amber/zinc coloring
- Review body text
- Date display
- data-testid attributes on all key elements
- Arrow function style, default export

### 6. Update showcase page
- Changed import from `@/components/ReviewCard` to `@/components/common/reviewCard`
- Fixed `export default function ShowcasePage()` to arrow function style to satisfy tcp validation

### 7. Typecheck
Pre-existing errors only (useFetchOrder test missing deps, playwright config mismatch). No errors from new component.

### 8. tcp validate-file
Both `components/common/reviewCard/index.tsx` and `app/showcase/page.tsx` passed with zero violations.

### 9. pnpm lint --fix
Pre-existing errors only in: CookieBanner, AuthContext, TodoContext, profile page, useFetchOrder test. No errors from new component files.

## Files Created/Modified
- `components/common/reviewCard/index.tsx` - NEW: ReviewCard component (directory-based)
- `app/showcase/page.tsx` - MODIFIED: updated import path + arrow function fix
