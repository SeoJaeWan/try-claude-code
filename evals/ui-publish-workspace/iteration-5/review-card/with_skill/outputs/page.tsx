"use client";

import ReviewCard from "./ReviewCard";

const SAMPLE_REVIEWS = [
  {
    id: "1",
    authorName: "김민준",
    avatarInitials: "김",
    rating: 5 as const,
    reviewText:
      "정말 훌륭한 제품입니다. 품질이 기대 이상이었고, 배송도 빠르게 받았습니다. 다음에도 꼭 구매할 의향이 있습니다.",
    createdAt: "2026-03-10",
  },
  {
    id: "2",
    authorName: "이서연",
    avatarUrl: "https://i.pravatar.cc/40?img=5",
    rating: 4 as const,
    reviewText:
      "전반적으로 만족스럽습니다. 다만 색상이 사진과 조금 달랐어요. 품질 자체는 좋습니다.",
    createdAt: "2026-03-08",
  },
  {
    id: "3",
    authorName: "박지호",
    avatarInitials: "박",
    rating: 3 as const,
    reviewText: "보통입니다. 가격 대비 품질은 괜찮지만 특별히 뛰어난 점은 없었습니다.",
    createdAt: "2026-03-05",
  },
  {
    id: "4",
    authorName: "최수아",
    avatarInitials: "최",
    rating: 1 as const,
    reviewText: "기대에 못 미쳤습니다. 배송이 너무 늦었고 포장 상태도 좋지 않았습니다.",
    createdAt: "2026-03-01",
  },
];

export default function ReviewCardPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        리뷰
      </h1>
      <div className="flex flex-col gap-4">
        {SAMPLE_REVIEWS.map((review) => (
          <ReviewCard
            key={review.id}
            authorName={review.authorName}
            avatarUrl={"avatarUrl" in review ? review.avatarUrl : undefined}
            avatarInitials={"avatarInitials" in review ? review.avatarInitials : undefined}
            rating={review.rating}
            reviewText={review.reviewText}
            createdAt={review.createdAt}
            testId={`review-card-${review.id}`}
          />
        ))}
      </div>
    </div>
  );
}
