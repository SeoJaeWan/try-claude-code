import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import ProductCard from "@/components/common/productCard";
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
          <Button testId="button-primary">기본 버튼</Button>
          <Button variant="secondary" testId="button-secondary">보조 버튼</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">ProductCard</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ProductCard
            imageUrl="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"
            name="프리미엄 손목시계"
            price={128000}
            badge="NEW"
            testId="product-card-1"
          />
          <ProductCard
            imageUrl="https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400"
            name="향수 컬렉션 세트"
            price={89000}
            testId="product-card-2"
          />
          <ProductCard
            imageUrl="https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400"
            name="러닝화 에어맥스"
            price={155000}
            badge="SALE"
            testId="product-card-3"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">ReviewCard</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReviewCard
            authorName="김민준"
            rating={5}
            body="정말 훌륭한 제품입니다. 품질도 좋고 배송도 빨랐어요. 강력히 추천합니다!"
            createdAt="2026-03-10"
          />
          <ReviewCard
            avatarUrl="https://i.pravatar.cc/150?img=5"
            authorName="이서연"
            rating={4}
            body="전반적으로 만족스럽습니다. 색상이 사진과 약간 달랐지만 품질은 기대 이상이에요."
            createdAt="2026-03-12"
          />
          <ReviewCard
            authorName="박지훈"
            rating={3}
            body="보통이에요. 가격 대비 나쁘지 않지만 특별히 인상적이지는 않았습니다."
            createdAt="2026-03-15"
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
