"use client";

import StarIcon from "./starIcon";

export interface ReviewCardProps {
  avatarUrl?: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  createdAt: string;
}

const ReviewCard = (props: ReviewCardProps) => {
  const { avatarUrl, authorName, rating, body, createdAt } = props;

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
      data-testid="review-card"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={authorName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {authorName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            data-testid="review-author"
          >
            {authorName}
          </p>
          <div
            className="mt-0.5 flex items-center gap-0.5"
            data-testid="review-rating"
            aria-label={`별점 ${rating}점`}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon key={star} filled={star <= rating} />
            ))}
          </div>
        </div>

        <time
          className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500"
          dateTime={createdAt}
          data-testid="review-date"
        >
          {createdAt}
        </time>
      </div>

      <p
        className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300"
        data-testid="review-body"
      >
        {body}
      </p>
    </div>
  );
};

export default ReviewCard;
