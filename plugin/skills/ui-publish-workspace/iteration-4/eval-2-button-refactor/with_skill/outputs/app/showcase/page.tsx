import Button from "@/components/common/button";
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
            authorName="김민지"
            rating={5}
            body="정말 훌륭한 제품이에요. 배송도 빠르고 품질도 기대 이상이었습니다. 적극 추천합니다!"
            createdAt="2026-03-10"
            testId="review-card-1"
          />
          <ReviewCard
            avatarUrl="https://i.pravatar.cc/40?img=12"
            authorName="이준혁"
            rating={3}
            body="전반적으로 무난합니다. 가격 대비 괜찮은 편이지만 개선할 부분도 있어 보입니다."
            createdAt="2026-02-25"
            testId="review-card-2"
          />
          <ReviewCard
            avatarUrl="https://i.pravatar.cc/40?img=47"
            authorName="박서연"
            rating={4}
            body="디자인이 예쁘고 사용감이 좋아요. 다음에도 구매할 의향이 있습니다."
            createdAt="2026-01-18"
            testId="review-card-3"
          />
        </div>
      </section>
    </div>
  );
}
