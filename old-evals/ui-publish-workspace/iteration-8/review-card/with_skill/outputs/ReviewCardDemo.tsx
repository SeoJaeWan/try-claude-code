"use client";

import ReviewCard from "./ReviewCard";

const SAMPLE_REVIEWS = [
  {
    id: "1",
    avatarFallback: "김민",
    authorName: "김민준",
    rating: 5 as const,
    reviewText:
      "정말 훌륭한 서비스입니다. 사용하기 쉽고 기능도 다양해서 매우 만족스럽습니다. 앞으로도 계속 이용할 것 같아요!",
    createdAt: "2026-03-15",
  },
  {
    id: "2",
    avatarUrl: "https://i.pravatar.cc/150?img=47",
    avatarFallback: "이서",
    authorName: "이서연",
    rating: 4 as const,
    reviewText: "전반적으로 좋은 경험이었습니다. 몇 가지 개선되면 더 좋을 것 같아요.",
    createdAt: "2026-03-10",
  },
  {
    id: "3",
    avatarFallback: "박지",
    authorName: "박지훈",
    rating: 3 as const,
    reviewText: "보통입니다. 기대했던 것보다는 조금 아쉬웠지만 나쁘지는 않았습니다.",
    createdAt: "2026-03-05",
  },
  {
    id: "4",
    avatarFallback: "최아",
    authorName: "최아름",
    rating: 5 as const,
    reviewText: "강력 추천합니다! 주변 친구들에게도 소개했어요. 정말 완벽한 서비스입니다.",
    createdAt: "2026-02-28",
  },
];

export default function ReviewCardDemo() {
  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          사용자 리뷰
        </h1>
        {SAMPLE_REVIEWS.map((review) => (
          <ReviewCard key={review.id} {...review} />
        ))}
      </div>
    </div>
  );
}
