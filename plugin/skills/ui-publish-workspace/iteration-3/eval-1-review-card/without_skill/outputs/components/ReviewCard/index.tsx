"use client";

export interface ReviewCardProps {
  avatarUrl?: string;
  avatarAlt?: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  createdAt: string;
  testId?: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`별점 ${rating}점`} role="img">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < rating ? "text-amber-400" : "text-zinc-200 dark:text-zinc-700"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function Avatar({ url, alt, name }: { url?: string; alt?: string; name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (url) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={url}
        alt={alt || name}
        className="h-10 w-10 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900"
      />
    );
  }

  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 ring-2 ring-white dark:bg-blue-900 dark:text-blue-200 dark:ring-zinc-900"
      aria-label={name}
    >
      {initials}
    </div>
  );
}

export default function ReviewCard({
  avatarUrl,
  avatarAlt,
  authorName,
  rating,
  body,
  createdAt,
  testId,
}: ReviewCardProps) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      data-testid={testId}
    >
      {/* Header: avatar + author + date */}
      <div className="flex items-start gap-3">
        <Avatar url={avatarUrl} alt={avatarAlt} name={authorName} />
        <div className="flex flex-1 flex-col gap-0.5">
          <span
            className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-50"
            data-testid={testId ? `${testId}-author` : undefined}
          >
            {authorName}
          </span>
          <time
            dateTime={createdAt}
            className="text-xs text-zinc-400 dark:text-zinc-500"
            data-testid={testId ? `${testId}-date` : undefined}
          >
            {createdAt}
          </time>
        </div>
        <StarRating rating={rating} />
      </div>

      {/* Review body */}
      <p
        className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
        data-testid={testId ? `${testId}-body` : undefined}
      >
        {body}
      </p>
    </div>
  );
}
