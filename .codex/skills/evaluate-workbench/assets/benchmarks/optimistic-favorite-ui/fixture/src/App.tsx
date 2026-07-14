import { ProductList } from "./products/ProductList";

const products = [
  { id: "coffee", name: "아메리카노", favorite: false },
  { id: "tea", name: "얼그레이", favorite: true },
];

export function App() {
  return <ProductList initialProducts={products} />;
}
