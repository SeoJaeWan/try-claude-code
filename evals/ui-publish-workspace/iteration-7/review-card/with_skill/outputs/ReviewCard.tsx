"use client";

export interface ReviewCardProps {
  avatarUrl?: string;
  avatarFallback: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  reviewText: string;
  createdAt: string;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      className={`h-4 w-4 ${filled ? "fill-amber-400 text-amber-400" : "fill-zinc-200 text-zinc-200 dark:fill-zinc-700 dark:text-zinc-700"}`}
      aria-hidden="true"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`별점 ${rating}점 / 5점`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} filled={i < rating} />
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
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header: Avatar + Author + Rating */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${authorName} 아바타`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">
              {avatarFallback}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{authorName}</p>
          <StarRating rating={rating} />
        </div>

        <time
          dateTime={createdAt}
          className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500"
        >
          {createdAt}
        </time>
      </div>

      {/* Review Text */}
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{reviewText}</p>
    </div>
  );
}
