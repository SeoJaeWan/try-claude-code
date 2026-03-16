"use client";

export interface ReviewCardProps {
  avatarUrl?: string;
  avatarFallback: string;
  reviewerName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  reviewText: string;
  createdAt: string;
}

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg
    className={`h-4 w-4 ${filled ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"}`}
    fill="currentColor"
    viewBox="0 0 20 20"
    aria-hidden="true"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const ReviewCard = (props: ReviewCardProps) => {
  const { avatarUrl, avatarFallback, reviewerName, rating, reviewText, createdAt } = props;

  const stars = [1, 2, 3, 4, 5] as const;

  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      data-testid="review-card"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={reviewerName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
              {avatarFallback}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {reviewerName}
            </p>
            <time className="flex-shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
              {createdAt}
            </time>
          </div>

          <div className="mt-1 flex items-center gap-0.5" aria-label={`${rating}점 만점 5점`}>
            {stars.map((star) => (
              <StarIcon key={star} filled={star <= rating} />
            ))}
          </div>

          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {reviewText}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReviewCard;
