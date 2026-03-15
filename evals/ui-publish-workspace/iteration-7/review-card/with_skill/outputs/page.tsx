import ReviewCard from "./ReviewCard";

const SAMPLE_REVIEWS = [
  {
    id: "1",
    avatarFallback: "김",
    authorName: "김지수",
    rating: 5 as const,
    reviewText: "정말 훌륭한 제품입니다. 품질이 기대 이상이고 배송도 빠르게 받았어요. 다음에도 꼭 구매할 것 같습니다!",
    createdAt: "2026-03-10",
  },
  {
    id: "2",
    avatarUrl: "https://i.pravatar.cc/150?img=5",
    avatarFallback: "이",
    authorName: "이민준",
    rating: 4 as const,
    reviewText: "전반적으로 만족스럽습니다. 색상이 사진과 조금 다르긴 했지만 퀄리티 자체는 좋아요.",
    createdAt: "2026-03-08",
  },
  {
    id: "3",
    avatarFallback: "박",
    authorName: "박서연",
    rating: 3 as const,
    reviewText: "보통 수준입니다. 가격 대비 평범한 편이에요. 특별히 나쁘지도 좋지도 않습니다.",
    createdAt: "2026-03-05",
  },
];

export default function ReviewCardDemo() {
  return (
    <main className="min-h-screen bg-zinc-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">리뷰</h1>
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
    </main>
  );
}
