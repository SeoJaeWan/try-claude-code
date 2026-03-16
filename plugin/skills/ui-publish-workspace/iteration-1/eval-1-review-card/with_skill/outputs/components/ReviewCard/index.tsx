"use client";

import Image from "next/image";

export interface ReviewCardProps {
  avatarUrl: string;
  avatarAlt?: string;
  authorName: string;
  rating: number;
  body: string;
  createdAt: string;
  testId?: string;
}

const MAX_RATING = 5;

export default function ReviewCard({
  avatarUrl,
  avatarAlt,
  authorName,
  rating,
  body,
  createdAt,
  testId,
}: ReviewCardProps) {
  const clampedRating = Math.min(Math.max(Math.round(rating), 0), MAX_RATING);

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      data-testid={testId}
    >
      {/* Header: Avatar + Author + Rating */}
      <div className="flex items-start gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={avatarUrl}
            alt={avatarAlt ?? authorName}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>

        <div className="flex flex-1 flex-col gap-0.5">
          <span
            className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-50"
            data-testid="review-card-author"
          >
            {authorName}
          </span>

          {/* Star Rating */}
          <div className="flex items-center gap-0.5" data-testid="review-card-rating" aria-label={`${clampedRating}점 / 5점`}>
            {Array.from({ length: MAX_RATING }).map((_, i) => (
              <svg
                key={i}
                className={`h-4 w-4 ${i < clampedRating ? "text-amber-400" : "text-zinc-200 dark:text-zinc-700"}`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>
      </div>

      {/* Review Body */}
      <p
        className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
        data-testid="review-card-body"
      >
        {body}
      </p>

      {/* Created At */}
      <time
        className="text-xs text-zinc-400 dark:text-zinc-500"
        dateTime={createdAt}
        data-testid="review-card-date"
      >
        {createdAt}
      </time>
    </div>
  );
}
