import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductList } from "../src/products/ProductList";
import type { Product } from "../src/products/types";

const products: Product[] = [
  { id: "coffee", name: "아메리카노", favorite: false },
  { id: "tea", name: "얼그레이", favorite: true },
];

test("filters products with the existing search input", async () => {
  const user = userEvent.setup();
  render(<ProductList initialProducts={products} updateFavorite={vi.fn()} />);

  await user.type(screen.getByRole("textbox", { name: "상품 검색" }), "아메");

  expect(screen.getByText("아메리카노")).toBeInTheDocument();
  expect(screen.queryByText("얼그레이")).not.toBeInTheDocument();
});

test("applies the server-confirmed favorite value", async () => {
  const user = userEvent.setup();
  const updateFavorite = vi.fn(async (productId: string, favorite: boolean) => ({
    id: productId,
    name: "아메리카노",
    favorite,
  }));
  render(<ProductList initialProducts={products} updateFavorite={updateFavorite} />);

  const coffeeButton = screen.getByRole("button", { name: "아메리카노 찜하기" });
  await user.click(coffeeButton);

  expect(updateFavorite).toHaveBeenCalledWith("coffee", true);
  await waitFor(() => expect(coffeeButton).toHaveTextContent("★"));
});
