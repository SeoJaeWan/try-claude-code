# ReviewCard Component - Summary

## What Was Done

Verified and confirmed the ReviewCard component at `components/common/reviewCard/index.tsx` follows project conventions and is the correct implementation. The flat `components/ReviewCard.tsx` exists as a legacy/seed file but the folder-based structure at `components/common/reviewCard/index.tsx` is the convention-compliant version.

## Component Location

- **Correct (folder-based):** `features/ui-publish-fixture/components/common/reviewCard/index.tsx`
- **Flat file (not convention):** `features/ui-publish-fixture/components/ReviewCard.tsx` (exists but should not be the primary component)

## Component Structure

### Props Interface (`ReviewCardProps`)

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `avatarUrl` | `string` | No | URL of user avatar image |
| `authorName` | `string` | Yes | Author's display name |
| `rating` | `1 \| 2 \| 3 \| 4 \| 5` | Yes | Star rating (1 to 5) |
| `body` | `string` | Yes | Review text content |
| `createdAt` | `string` | Yes | Display date string |

## Convention Compliance

- **"use client" directive** - present at top of file
- **Folder-based structure** - `components/common/reviewCard/index.tsx` (not flat `.tsx`)
- **Arrow function component** - `const ReviewCard = (...) => {}` (matches Button, ProductCard)
- **Named export for types** - `export interface ReviewCardProps`
- **Default export for component** - `export default ReviewCard`
- **Visual-only** - no `useEffect`, `fetch`, `useQuery`, or any data-fetching logic
- **Tailwind CSS** - consistent card shell using `rounded-xl border border-zinc-200 bg-white p-5` with dark mode variants
- **data-testid attributes** - `review-card`, `review-card-avatar`, `review-card-author`, `review-card-rating`, `review-card-body`, `review-card-date`

## Key Implementation Details

1. **Avatar**: Renders `<img>` with `avatarUrl` when provided; falls back to initials extracted from `authorName` in a zinc circle
2. **Star Rating**: 5 SVG stars rendered via `Array.from({ length: 5 })`, filled amber (`text-amber-400`) for stars <= rating, unfilled zinc for the rest. `aria-label` set to `별점 ${rating}점` for accessibility
3. **Review Body**: `<p>` with `text-sm leading-relaxed` styling
4. **Created Date**: `<p>` with `text-xs text-zinc-400` styling

## Imported In

`app/showcase/page.tsx` imports `ReviewCard` from `@/components/common/reviewCard`
