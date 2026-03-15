"use client";

export interface ReviewCardProps {
  avatarUrl?: string;
  avatarAlt?: string;
  rating?: number;
  reviewText?: string;
  createdAt?: string;
  testId?: string;
}

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
    />
  </svg>
);

const StarRating = ({ rating = 0 }: { rating: number }) => {
  const clampedRating = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <div className="flex items-center gap-0.5" aria-label={`별점 ${clampedRating}점 / 5점`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={i < clampedRating ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"}
        >
          <StarIcon filled={i < clampedRating} />
        </span>
      ))}
    </div>
  );
};

export default function ReviewCard({
  avatarUrl,
  avatarAlt = "사용자 아바타",
  rating = 0,
  reviewText,
  createdAt,
  testId,
}: ReviewCardProps) {
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
      data-testid={testId ?? "review-card"}
    >
      {/* Header: Avatar + Rating + Date */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
            data-testid="review-card-avatar"
          >
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={avatarUrl}
                alt={avatarAlt}
                className="h-full w-full object-cover"
              />
            ) : (
              <svg
                className="h-full w-full p-2 text-zinc-400 dark:text-zinc-500"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" />
              </svg>
            )}
          </div>

          {/* Star Rating */}
          <div data-testid="review-card-rating">
            <StarRating rating={rating} />
            <span className="mt-0.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {Math.min(5, Math.max(0, Math.round(rating)))} / 5
            </span>
          </div>
        </div>

        {/* Created At */}
        {createdAt && (
          <time
            className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500"
            dateTime={createdAt}
            data-testid="review-card-date"
          >
            {createdAt}
          </time>
        )}
      </div>

      {/* Review Text */}
      {reviewText && (
        <p
          className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
          data-testid="review-card-text"
        >
          {reviewText}
        </p>
      )}
    </div>
  );
}
