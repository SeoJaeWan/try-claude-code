import { useMemo, useState } from "react";

import { updateFavorite as updateFavoriteRequest } from "../api/favorites";
import { ProductCard } from "./ProductCard";
import type { Product, UpdateFavorite } from "./types";

type ProductListProps = {
  initialProducts: Product[];
  updateFavorite?: UpdateFavorite;
};

export function ProductList({
  initialProducts,
  updateFavorite = updateFavoriteRequest,
}: ProductListProps) {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return products;
    return products.filter((product) => product.name.toLocaleLowerCase().includes(normalized));
  }, [products, query]);

  async function handleToggle(product: Product) {
    setError(null);
    try {
      const updated = await updateFavorite(product.id, !product.favorite);
      setProducts((current) =>
        current.map((candidate) => (candidate.id === updated.id ? updated : candidate)),
      );
    } catch {
      setError("찜 상태를 변경하지 못했습니다.");
    }
  }

  return (
    <section aria-labelledby="products-heading">
      <h1 id="products-heading">상품 목록</h1>
      <label>
        상품 검색
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <ul>
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} onToggle={handleToggle} />
        ))}
      </ul>
    </section>
  );
}
