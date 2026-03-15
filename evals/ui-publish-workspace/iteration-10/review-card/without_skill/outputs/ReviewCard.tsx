"use client";

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
    <div className="flex items-center gap-0.5" aria-label={`별점 ${rating}점`} role="img">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < rating ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
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
    <div
      className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      data-testid="review-card"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${authorName} 아바타`}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {avatarFallback}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50" data-testid="review-author">
              {authorName}
            </p>
            <time
              className="text-xs text-zinc-500 dark:text-zinc-400"
              dateTime={createdAt}
              data-testid="review-date"
            >
              {createdAt}
            </time>
          </div>

          <div className="mt-1" data-testid="review-rating">
            <StarRating rating={rating} />
          </div>

          <p
            className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
            data-testid="review-text"
          >
            {reviewText}
          </p>
        </div>
      </div>
    </div>
  );
}
