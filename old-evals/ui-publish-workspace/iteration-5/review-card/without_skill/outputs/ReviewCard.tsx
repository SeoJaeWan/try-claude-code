"use client";

export interface ReviewCardProps {
  avatarUrl?: string;
  userName: string;
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
          fill={i < rating ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.5}
          className={`h-4 w-4 ${i < rating ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"}`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-3.025a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
          />
        </svg>
      ))}
    </div>
  );
}

function Avatar({ avatarUrl, userName }: { avatarUrl?: string; userName: string }) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={userName}
        className="h-10 w-10 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-700"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white ring-2 ring-zinc-200 dark:ring-zinc-700">
      {initials}
    </div>
  );
}

export default function ReviewCard({
  avatarUrl,
  userName,
  rating,
  reviewText,
  createdAt,
}: ReviewCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <Avatar avatarUrl={avatarUrl} userName={userName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900 truncate dark:text-zinc-50">
              {userName}
            </p>
            <time
              dateTime={createdAt}
              className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500"
            >
              {createdAt}
            </time>
          </div>
          <div className="mt-1">
            <StarRating rating={rating} />
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {reviewText}
      </p>
    </div>
  );
}
