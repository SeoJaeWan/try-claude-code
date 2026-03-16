"use client";

import StarIcon from "./starIcon";

export interface ReviewCardProps {
  avatarUrl?: string;
  avatarAlt?: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  publishedAt: string;
  testId?: string;
}

const ReviewCard = ({
  avatarUrl,
  avatarAlt,
  authorName,
  rating,
  body,
  publishedAt,
  testId,
}: ReviewCardProps) => {
  return (
    <article
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      data-testid={testId}
      style={{ fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* Header: avatar + author + date */}
      <div className="flex items-start gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={avatarAlt ?? authorName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {authorName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <span
            className="text-sm font-semibold leading-none text-zinc-900 dark:text-zinc-50"
            data-testid={testId ? `${testId}-author` : undefined}
          >
            {authorName}
          </span>
          <div
            className="flex items-center gap-0.5"
            role="img"
            aria-label={`별점 ${rating}점`}
          >
            {Array.from({ length: 5 }, (_, i) => (
              <StarIcon key={i} filled={i < rating} />
            ))}
          </div>
        </div>

        <time
          className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500"
          dateTime={publishedAt}
          data-testid={testId ? `${testId}-date` : undefined}
        >
          {publishedAt}
        </time>
      </div>

      {/* Review body */}
      <p
        className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
        data-testid={testId ? `${testId}-body` : undefined}
      >
        {body}
      </p>
    </article>
  );
};

export default ReviewCard;
