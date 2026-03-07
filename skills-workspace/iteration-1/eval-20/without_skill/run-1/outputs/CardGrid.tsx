import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CardGridItem {
  /** Unique identifier for the card */
  id: string;
  /** Card title */
  title: string;
  /** Optional subtitle / description shown below the title */
  description?: string;
  /** Main body content – can be a string or any React node */
  content?: React.ReactNode;
  /** Optional footer content (e.g. action buttons) */
  footer?: React.ReactNode;
  /** Optional image displayed at the top of the card */
  image?: {
    src: string;
    alt: string;
  };
}

export interface CardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Array of items to render as cards */
  items: CardGridItem[];
  /**
   * Number of columns at each breakpoint.
   * Defaults to { sm: 1, md: 2, lg: 3 }.
   * Values map to Tailwind grid-cols utilities.
   */
  columns?: {
    sm?: 1 | 2 | 3 | 4;
    md?: 1 | 2 | 3 | 4;
    lg?: 1 | 2 | 3 | 4;
    xl?: 1 | 2 | 3 | 4 | 5 | 6;
  };
  /** Gap between cards – maps to Tailwind gap utilities. Default is 6. */
  gap?: 2 | 4 | 6 | 8 | 10 | 12;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const colsMap: Record<string, Record<number, string>> = {
  sm: { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" },
  md: { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" },
  lg: { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" },
  xl: {
    1: "xl:grid-cols-1",
    2: "xl:grid-cols-2",
    3: "xl:grid-cols-3",
    4: "xl:grid-cols-4",
    5: "xl:grid-cols-5",
    6: "xl:grid-cols-6",
  },
};

const gapMap: Record<number, string> = {
  2: "gap-2",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A responsive card grid built on top of shadcn/ui's Card primitives.
 *
 * Usage:
 * ```tsx
 * <CardGrid
 *   items={[
 *     { id: "1", title: "Card 1", description: "A short blurb", content: <p>Body</p> },
 *     { id: "2", title: "Card 2", description: "Another blurb" },
 *   ]}
 *   columns={{ sm: 1, md: 2, lg: 3 }}
 *   gap={6}
 * />
 * ```
 */
export function CardGrid({
  items,
  columns = { sm: 1, md: 2, lg: 3 },
  gap = 6,
  className,
  ...props
}: CardGridProps) {
  // Build responsive grid class string
  const gridCols = Object.entries(columns)
    .map(([bp, cols]) => colsMap[bp]?.[cols])
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cn("grid grid-cols-1", gridCols, gapMap[gap], className)}
      {...props}
    >
      {items.map((item) => (
        <Card
          key={item.id}
          className="flex flex-col transition-shadow hover:shadow-lg"
        >
          {/* Optional image */}
          {item.image && (
            <div className="overflow-hidden rounded-t-lg">
              <img
                src={item.image.src}
                alt={item.image.alt}
                className="h-48 w-full object-cover transition-transform hover:scale-105"
              />
            </div>
          )}

          <CardHeader>
            <CardTitle className="text-lg">{item.title}</CardTitle>
            {item.description && (
              <CardDescription>{item.description}</CardDescription>
            )}
          </CardHeader>

          {item.content && (
            <CardContent className="flex-1">{item.content}</CardContent>
          )}

          {item.footer && <CardFooter>{item.footer}</CardFooter>}
        </Card>
      ))}
    </div>
  );
}

export default CardGrid;
