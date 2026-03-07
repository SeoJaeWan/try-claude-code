# Responsive Card Grid Component with shadcn/ui Styling

## Overview

A reusable, responsive card grid component built on top of shadcn/ui's `Card` primitives and Tailwind CSS grid utilities.

## Files Created

| File | Purpose |
|------|---------|
| `CardGrid.tsx` | Main component with full TypeScript types and configurable props |
| `CardGridDemo.tsx` | Demo page showing the component with sample data |

## Component API

### `CardGrid` Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `CardGridItem[]` | required | Array of card data objects |
| `columns` | `{ sm?, md?, lg?, xl? }` | `{ sm: 1, md: 2, lg: 3 }` | Responsive column counts per breakpoint |
| `gap` | `2 \| 4 \| 6 \| 8 \| 10 \| 12` | `6` | Gap between cards (Tailwind spacing) |

### `CardGridItem` Shape

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique key |
| `title` | `string` | Yes | Card heading |
| `description` | `string` | No | Subtitle text |
| `content` | `ReactNode` | No | Card body |
| `footer` | `ReactNode` | No | Footer area (buttons, links) |
| `image` | `{ src, alt }` | No | Top image with hover zoom |

## Key Design Decisions

1. **shadcn/ui Card primitives** -- Uses `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter` directly so the component inherits all shadcn/ui theming.
2. **CSS Grid for layout** -- Tailwind's `grid` + `grid-cols-*` ensures clean responsive behaviour without JavaScript-based resizing.
3. **Configurable breakpoints** -- The `columns` prop lets consumers control column counts at each Tailwind breakpoint via a static class map (avoids dynamic class generation issues with Tailwind's JIT compiler).
4. **Hover effects** -- Cards gain a subtle `shadow-lg` on hover; images scale up slightly for visual feedback.
5. **Flexible content slots** -- `content` and `footer` accept `ReactNode`, making the grid usable for any card layout (product cards, project cards, team profiles, etc.).

## Prerequisites

- A Next.js / Vite / React project with Tailwind CSS configured
- shadcn/ui installed (`npx shadcn-ui@latest init`)
- The `Card` component added via `npx shadcn-ui@latest add card`
- The `cn` utility from `@/lib/utils` (installed automatically by shadcn/ui)

## Usage Example

```tsx
import { CardGrid } from "./CardGrid";

<CardGrid
  items={[
    { id: "1", title: "First Card", description: "Hello world" },
    { id: "2", title: "Second Card", content: <p>Custom body</p> },
  ]}
  columns={{ sm: 1, md: 2, lg: 3 }}
  gap={6}
/>
```
