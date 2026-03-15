"use client";

import ReviewCard from "./ReviewCard";

const SAMPLE_REVIEWS = [
  {
    id: "1",
    avatarFallback: "김",
    authorName: "김민준",
    rating: 5 as const,
    reviewText:
      "정말 훌륭한 제품이에요! 품질도 좋고 배송도 빠르게 왔습니다. 다음에도 꼭 재구매할 것 같아요.",
    createdAt: "2026-03-10",
  },
  {
    id: "2",
    avatarUrl: "https://i.pravatar.cc/40?img=5",
    avatarFallback: "이",
    authorName: "이서연",
    rating: 4 as const,
    reviewText:
      "전반적으로 만족스럽습니다. 색상이 사진과 조금 다르지만 실제로 보면 더 예뻐요.",
    createdAt: "2026-03-08",
  },
  {
    id: "3",
    avatarFallback: "박",
    authorName: "박지호",
    rating: 3 as const,
    reviewText: "보통입니다. 가격 대비 나쁘지 않지만 특별히 뛰어나지도 않아요.",
    createdAt: "2026-03-05",
  },
  {
    id: "4",
    avatarFallback: "최",
    authorName: "최수아",
    rating: 1 as const,
    reviewText: "기대했던 것과 많이 달라서 실망스러웠습니다.",
    createdAt: "2026-02-28",
  },
];

export default function ReviewCardDemo() {
  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-xl font-bold text-zinc-900 dark:text-zinc-50">
        사용자 리뷰
      </h1>
      <div className="flex flex-col gap-4">
        {SAMPLE_REVIEWS.map((review) => (
          <ReviewCard
            key={review.id}
            avatarUrl={review.avatarUrl}
            avatarFallback={review.avatarFallback}
            authorName={review.authorName}
            rating={review.rating}
            reviewText={review.reviewText}
            createdAt={review.createdAt}
          />
        ))}
      </div>
    </div>
  );
}
