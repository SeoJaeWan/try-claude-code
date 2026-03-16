import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import ReviewCard from "@/components/ReviewCard";

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
            authorName="김지수"
            rating={5}
            body="정말 만족스러운 제품이에요. 품질도 훌륭하고 배송도 빨랐습니다. 다음에도 꼭 구매할 예정입니다."
            createdAt="2026-03-10"
            testId="review-card-1"
          />
          <ReviewCard
            avatarUrl="https://i.pravatar.cc/80?img=12"
            authorName="박민준"
            rating={4}
            body="전반적으로 좋은 경험이었습니다. 사용하기 편하고 디자인도 마음에 들어요."
            createdAt="2026-02-28"
            testId="review-card-2"
          />
          <ReviewCard
            authorName="이서연"
            rating={3}
            body="평범한 제품입니다. 기대했던 것보다는 조금 아쉽지만 가격 대비 나쁘지 않아요."
            createdAt="2026-02-15"
            testId="review-card-3"
          />
        </div>
      </section>
    </div>
  );
}
