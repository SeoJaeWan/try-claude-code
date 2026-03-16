import Button from "@/components/Button";
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
          <Button label="기본 버튼" />
          <Button label="보조 버튼" tone="secondary" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">ReviewCard</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReviewCard
            authorName="김지수"
            rating={5}
            body="정말 훌륭한 제품입니다. 품질도 좋고 배송도 빠르네요. 다음에도 구매할 의향이 있습니다."
            createdAt="2024-03-10"
          />
          <ReviewCard
            avatarUrl="https://i.pravatar.cc/150?img=3"
            authorName="이민준"
            rating={3}
            body="전반적으로 괜찮지만 아쉬운 점도 있었습니다. 개선이 되면 더 좋을 것 같아요."
            createdAt="2024-02-28"
          />
          <ReviewCard
            authorName="박서연"
            rating={1}
            body="기대에 미치지 못했습니다. 반품을 고려 중입니다."
            createdAt="2024-01-15"
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
