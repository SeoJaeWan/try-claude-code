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

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={filled ? 0 : 1.5}
    className={`h-4 w-4 ${filled ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"}`}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
      clipRule="evenodd"
    />
  </svg>
);

const ReviewCard = ({
  avatarUrl,
  avatarAlt,
  authorName,
  rating,
  body,
  createdAt,
  testId,
}: ReviewCardProps) => {
  const clampedRating = Math.min(5, Math.max(1, Math.round(rating)));

  return (
    <article
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      data-testid={testId}
      style={{ fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* Author row */}
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={avatarUrl}
            alt={avatarAlt ?? authorName}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
            {authorName}
          </span>
          <time
            dateTime={createdAt}
            className="text-xs text-zinc-400 dark:text-zinc-500"
          >
            {createdAt}
          </time>
        </div>
      </div>

      {/* Star rating */}
      <div className="flex items-center gap-0.5" aria-label={`별점 ${clampedRating}점 / 5점`}>
        {Array.from({ length: 5 }, (_, i) => (
          <StarIcon key={i} filled={i < clampedRating} />
        ))}
        <span className="ml-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {clampedRating} / 5
        </span>
      </div>

      {/* Review body */}
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {body}
      </p>
    </article>
  );
};

export default ReviewCard;
