import ReviewCard from "./ReviewCard";

const SAMPLE_REVIEWS = [
  {
    avatarUrl: "https://i.pravatar.cc/80?img=1",
    avatarFallback: "KJ",
    authorName: "김지우",
    rating: 5 as const,
    reviewText:
      "정말 훌륭한 제품입니다. 품질이 기대 이상이었고, 배송도 매우 빠르게 도착했어요. 다음에도 꼭 구매하고 싶습니다!",
    createdAt: "2026-03-10",
  },
  {
    avatarUrl: "https://i.pravatar.cc/80?img=5",
    avatarFallback: "LP",
    authorName: "이민준",
    rating: 4 as const,
    reviewText:
      "전반적으로 만족스러운 구매였습니다. 다만 포장이 살짝 아쉬웠지만, 제품 자체는 매우 좋았어요.",
    createdAt: "2026-03-08",
  },
  {
    avatarFallback: "박",
    authorName: "박서연",
    rating: 3 as const,
    reviewText: "보통 수준의 제품입니다. 가격 대비 만족도는 나쁘지 않지만, 특별히 인상적이지는 않았습니다.",
    createdAt: "2026-02-28",
  },
  {
    avatarUrl: "https://i.pravatar.cc/80?img=12",
    avatarFallback: "CW",
    authorName: "최우진",
    rating: 5 as const,
    reviewText:
      "완벽해요! 색상도 예쁘고 사이즈도 딱 맞았습니다. 친구들에게도 추천했습니다. 강력 추천 드립니다.",
    createdAt: "2026-02-20",
  },
];

export default function ReviewCardPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          고객 리뷰
        </h1>
        <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
          {SAMPLE_REVIEWS.length}개의 리뷰
        </p>

        <div className="flex flex-col gap-4">
          {SAMPLE_REVIEWS.map((review, index) => (
            <ReviewCard key={index} {...review} />
          ))}
        </div>
      </div>
    </main>
  );
}
