import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductList } from "../src/products/ProductList";
import type { Product } from "../src/products/types";

const products: Product[] = [
  { id: "coffee", name: "아메리카노", favorite: false },
  { id: "tea", name: "얼그레이", favorite: true },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test("updates immediately, blocks a duplicate click, and keeps a successful result", async () => {
  const user = userEvent.setup();
  const request = deferred<Product>();
  const updateFavorite = vi.fn(() => request.promise);
  render(<ProductList initialProducts={products} updateFavorite={updateFavorite} />);

  const coffeeButton = screen.getByRole("button", { name: /아메리카노/ });
  expect(coffeeButton).toHaveAttribute("aria-pressed", "false");

  await user.click(coffeeButton);
  expect(coffeeButton).toHaveAttribute("aria-pressed", "true");
  expect(coffeeButton).toBeDisabled();
  await user.click(coffeeButton);
  expect(updateFavorite).toHaveBeenCalledTimes(1);
  expect(updateFavorite).toHaveBeenCalledWith("coffee", true);

  await act(async () => {
    request.resolve({ id: "coffee", name: "아메리카노", favorite: true });
    await request.promise;
  });
  expect(coffeeButton).toHaveAttribute("aria-pressed", "true");
  expect(coffeeButton).not.toBeDisabled();
});

test("rolls back only the failed product and exposes an alert", async () => {
  const user = userEvent.setup();
  const request = deferred<Product>();
  const updateFavorite = vi.fn(() => request.promise);
  render(<ProductList initialProducts={products} updateFavorite={updateFavorite} />);

  const coffeeItem = screen.getByText("아메리카노").closest("li");
  const teaItem = screen.getByText("얼그레이").closest("li");
  expect(coffeeItem).not.toBeNull();
  expect(teaItem).not.toBeNull();
  const coffeeButton = within(coffeeItem!).getByRole("button", { name: /아메리카노/ });
  const teaButton = within(teaItem!).getByRole("button", { name: /얼그레이/ });

  expect(coffeeButton).toHaveAttribute("aria-pressed", "false");
  expect(teaButton).toHaveAttribute("aria-pressed", "true");
  await user.click(coffeeButton);
  expect(coffeeButton).toHaveAttribute("aria-pressed", "true");
  expect(teaButton).toHaveAttribute("aria-pressed", "true");

  await act(async () => {
    request.reject(new Error("network unavailable"));
    await request.promise.catch(() => undefined);
  });

  expect(coffeeButton).toHaveAttribute("aria-pressed", "false");
  expect(teaButton).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("alert")).toHaveTextContent("찜 상태를 변경하지 못했습니다");
});

test("keeps pending state independent per product", async () => {
  const user = userEvent.setup();
  const requests = new Map<string, ReturnType<typeof deferred<Product>>>();
  const updateFavorite = vi.fn((productId: string) => {
    const request = deferred<Product>();
    requests.set(productId, request);
    return request.promise;
  });
  render(<ProductList initialProducts={products} updateFavorite={updateFavorite} />);

  const coffeeButton = screen.getByRole("button", { name: /아메리카노/ });
  const teaButton = screen.getByRole("button", { name: /얼그레이/ });
  await user.click(coffeeButton);

  expect(coffeeButton).toBeDisabled();
  expect(teaButton).not.toBeDisabled();

  await act(async () => {
    requests.get("coffee")!.resolve({ id: "coffee", name: "아메리카노", favorite: true });
    await requests.get("coffee")!.promise;
  });
});

test("preserves the existing product search behavior", async () => {
  const user = userEvent.setup();
  render(<ProductList initialProducts={products} updateFavorite={vi.fn()} />);

  await user.type(screen.getByRole("textbox", { name: "상품 검색" }), "얼그");

  expect(screen.queryByText("아메리카노")).not.toBeInTheDocument();
  expect(screen.getByText("얼그레이")).toBeInTheDocument();
});
