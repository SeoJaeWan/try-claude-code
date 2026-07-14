import type { Product, UpdateFavorite } from "../products/types";

export const updateFavorite: UpdateFavorite = async (productId, favorite) => {
  const response = await fetch(`/api/products/${productId}/favorite`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ favorite }),
  });

  if (!response.ok) {
    throw new Error(`favorite update failed: ${response.status}`);
  }

  return (await response.json()) as Product;
};
