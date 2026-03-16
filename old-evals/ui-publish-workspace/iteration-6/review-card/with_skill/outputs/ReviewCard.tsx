"use client";

import Image from "next/image";

export interface ReviewCardProps {
  avatarUrl?: string;
  avatarFallback: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  reviewText: string;
  createdAt: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`별점 ${rating}점`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={`h-4 w-4 ${i < rating ? "fill-amber-400 text-amber-400" : "fill-zinc-200 text-zinc-200 dark:fill-zinc-700 dark:text-zinc-700"}`}
          aria-hidden="true"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewCard({
  avatarUrl,
  avatarFallback,
  authorName,
  rating,
  reviewText,
  createdAt,
}: ReviewCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={`${authorName} 아바타`}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {avatarFallback}
            </div>
          )}
        </div>

        {/* Header: name + date + stars */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {authorName}
            </span>
            <time
              dateTime={createdAt}
              className="text-xs text-zinc-400 dark:text-zinc-500"
            >
              {createdAt}
            </time>
          </div>
          <div className="mt-1">
            <StarRating rating={rating} />
          </div>
        </div>
      </div>

      {/* Review text */}
      <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {reviewText}
      </p>
    </div>
  );
}
