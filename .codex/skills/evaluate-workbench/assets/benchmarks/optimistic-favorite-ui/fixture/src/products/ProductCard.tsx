import type { Product } from "./types";

type ProductCardProps = {
  product: Product;
  onToggle: (product: Product) => void;
};

export function ProductCard({ product, onToggle }: ProductCardProps) {
  return (
    <li className="product-card">
      <span>{product.name}</span>
      <button
        type="button"
        aria-label={`${product.name} 찜하기`}
        onClick={() => onToggle(product)}
      >
        {product.favorite ? "★" : "☆"}
      </button>
    </li>
  );
}
