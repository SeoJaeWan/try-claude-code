import ReviewCard from "./ReviewCard";

const SAMPLE_REVIEWS = [
  {
    id: 1,
    authorName: "김민준",
    rating: 5 as const,
    reviewText:
      "정말 훌륭한 서비스입니다! 사용하기 편리하고 기능도 다양해서 매우 만족스럽습니다. 앞으로도 자주 이용할 것 같아요.",
    createdAt: "2026-03-14",
  },
  {
    id: 2,
    avatarUrl: "https://i.pravatar.cc/80?img=5",
    authorName: "이서연",
    rating: 4 as const,
    reviewText:
      "전반적으로 좋은 경험이었습니다. 일부 기능이 개선되면 더 좋을 것 같지만, 기본적인 사용성은 매우 우수합니다.",
    createdAt: "2026-03-12",
  },
  {
    id: 3,
    avatarUrl: "https://i.pravatar.cc/80?img=12",
    authorName: "박지호",
    rating: 3 as const,
    reviewText: "보통 수준입니다. 몇 가지 버그가 있었지만 지원팀의 도움으로 해결할 수 있었습니다.",
    createdAt: "2026-03-10",
  },
  {
    id: 4,
    authorName: "최유나",
    rating: 2 as const,
    reviewText:
      "기대에 못 미치는 부분이 있었습니다. 응답 속도가 느리고 UI가 직관적이지 않아서 아쉬웠습니다.",
    createdAt: "2026-03-08",
  },
  {
    id: 5,
    avatarUrl: "https://i.pravatar.cc/80?img=33",
    authorName: "강도현",
    rating: 1 as const,
    reviewText: "사용하기 매우 불편했습니다. 기본 기능조차 원활하게 동작하지 않아 실망스러웠습니다.",
    createdAt: "2026-03-05",
  },
];

export default function ReviewCardPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">사용자 리뷰</h1>
      <div className="flex flex-col gap-4">
        {SAMPLE_REVIEWS.map((review) => (
          <ReviewCard
            key={review.id}
            avatarUrl={review.avatarUrl}
            authorName={review.authorName}
            rating={review.rating}
            reviewText={review.reviewText}
            createdAt={review.createdAt}
          />
        ))}
      </div>
    </main>
  );
}
