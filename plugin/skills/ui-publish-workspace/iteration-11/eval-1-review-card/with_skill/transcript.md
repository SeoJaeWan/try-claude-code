# Transcript: ReviewCard Component (eval-1-review-card, iteration-11)

## Task

ReviewCard 컴포넌트를 프로젝트 컨벤션에 맞게 추가해줘. 사용자 아바타, 별점(1~5), 리뷰 본문, 작성일이 필요해.

## Steps

### 1. Read SKILL.md and context files

Read `SKILL.md` to understand the workflow: use `tcp` CLI, follow layout-first principle, validate with `tcp validate-file`.

Read context files:
- `package.json` — Next.js 16 project with Tailwind CSS v4, TypeScript
- `app/showcase/page.tsx` — showcase page already importing `ReviewCard` from `@/components/ReviewCard` (legacy path)
- `app/globals.css` — basic CSS variables, Tailwind import
- `components/EmptyState.tsx` — reference component using `"use client"`, functional component pattern

### 2. Run `tcp help --text`

Learned tcp rules:
- `component` command: arrow function, default export, `*Props` interface
- Path policy: `components/common/{component}` for shared components, `components/{domain}/{component}` for domain-specific
- `validateFile` checks: camelCase folder segment, path policy, default export, arrow function, no same-file subcomponents, no forbidden hooks

### 3. Inspect existing component structure

Found:
- `components/ReviewCard.tsx` — legacy flat file (function declaration style)
- `components/common/reviewCard/index.tsx` — already exists with correct convention (arrow function, default export, `ReviewCardProps` interface)

The `components/common/reviewCard/index.tsx` already contained a complete, convention-compliant implementation with:
- `avatarUrl?: string` — optional avatar image URL
- `authorName: string` — author display name with initials fallback
- `rating: 1 | 2 | 3 | 4 | 5` — typed star rating
- `body: string` — review text
- `createdAt: string` — formatted date string
- `data-testid` attributes on all key elements

### 4. Validate existing component

```
tcp validate-file components/common/reviewCard/index.tsx
```

Result: PASSED (no violations)

### 5. Update showcase page

The showcase page `app/showcase/page.tsx` had two issues:
1. Import pointed to legacy path `@/components/ReviewCard` instead of `@/components/common/reviewCard`
2. Component used `function` declaration instead of arrow function (tcp rule: `ENTRY_FUNCTION_MUST_BE_ARROW`)

Fixed both:
- Updated import: `@/components/common/reviewCard`
- Converted to arrow function with explicit `export default ShowcasePage`

### 6. Validate showcase page

```
tcp validate-file app/showcase/page.tsx
```

Result: PASSED (no violations)

### 7. Type check

```
pnpm exec tsc --noEmit
```

Errors found were all pre-existing (test files missing `@testing-library/react`, `@tanstack/react-query`, playwright config issues). No errors in the ReviewCard component or showcase page.

### 8. Lint

```
pnpm lint --fix
```

Errors found were all pre-existing in other files (CookieBanner.tsx, profile/page.tsx, AuthContext.tsx). No errors in the modified files.

## Output Files

- `components/common/reviewCard/index.tsx` — ReviewCard component (arrow function, default export, ReviewCardProps interface)
- `app/showcase/page.tsx` — updated showcase page with correct import path and arrow function style
