import Button from "@/components/showcase/button";
import EmptyState from "@/components/EmptyState";
import ReviewCard from "@/components/common/reviewCard";

const ShowcasePage = () => {
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
          <Button>기본 버튼</Button>
          <Button variant="secondary">보조 버튼</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">ReviewCard</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ReviewCard
            authorName="김지수"
            rating={5}
            body="정말 훌륭한 제품입니다. 품질도 좋고 배송도 빨랐어요. 강력히 추천합니다!"
            createdAt="2026-03-10"
          />
          <ReviewCard
            avatarUrl="https://i.pravatar.cc/80?img=12"
            authorName="이민준"
            rating={3}
            body="전반적으로 괜찮지만 포장이 아쉬웠습니다. 제품 자체는 기대했던 수준입니다."
            createdAt="2026-03-05"
          />
          <ReviewCard
            avatarUrl="https://i.pravatar.cc/80?img=47"
            authorName="박서연"
            rating={4}
            body="가격 대비 만족스럽습니다. 디자인이 세련되고 사용하기 편합니다."
            createdAt="2026-02-28"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
        <EmptyState
          title="Showcase Empty State"
          description="Visual shell과 locator refactor를 확인하기 위한 seed 영역입니다."
        />
      </section>
    </div>
  );
};

export default ShowcasePage;
