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
    <div className="flex items-center gap-0.5" aria-label={`${rating}점 만점 5점`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={`h-4 w-4 ${
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-zinc-200 text-zinc-200 dark:fill-zinc-700 dark:text-zinc-700"
          }`}
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
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header: Avatar + Name + Date */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={authorName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                {avatarFallback}
              </span>
            )}
          </div>
          {/* Author name */}
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {authorName}
          </span>
        </div>

        {/* Created date */}
        <time
          dateTime={createdAt}
          className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500"
        >
          {createdAt}
        </time>
      </div>

      {/* Star rating */}
      <StarRating rating={rating} />

      {/* Review text */}
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {reviewText}
      </p>
    </div>
  );
}
