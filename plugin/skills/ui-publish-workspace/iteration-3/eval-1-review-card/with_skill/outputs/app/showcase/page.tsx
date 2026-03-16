import Button from "@/components/common/button";
import EmptyState from "@/components/EmptyState";
import ReviewCard from "@/components/common/reviewCard";

export default function ShowcasePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">UI Publish Showcase</h1>
        <p className="text-sm text-zinc-500">
          Legacy seed와 visual-only component refactor surface를 모아둔 페이지다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Legacy Button</h2>
        <div className="flex gap-3">
          <Button label="기본 버튼" />
          <Button label="보조 버튼" tone="secondary" />
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
        <EmptyState
          title="Showcase Empty State"
          description="Visual shell과 locator refactor를 확인하기 위한 seed 영역입니다."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">ReviewCard</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReviewCard
            authorName="김민준"
            rating={5}
            body="정말 만족스러운 제품입니다. 품질이 뛰어나고 배송도 빠르게 왔어요. 다음에도 구매할 예정입니다."
            createdAt="2026-03-10"
            testId="review-card-1"
          />
          <ReviewCard
            avatarUrl="https://i.pravatar.cc/80?img=47"
            authorName="이서연"
            rating={4}
            body="전반적으로 좋았습니다. 포장이 꼼꼼하게 되어 있어서 안심이 됐어요. 가격 대비 훌륭한 선택입니다."
            createdAt="2026-03-08"
            testId="review-card-2"
          />
          <ReviewCard
            authorName="박지호"
            rating={3}
            body="보통이에요. 기대했던 것보다는 조금 아쉬운 부분이 있었지만 사용하기에는 무난합니다."
            createdAt="2026-03-05"
            testId="review-card-3"
          />
        </div>
      </section>
    </div>
  );
}
