export type Product = {
  id: string;
  name: string;
  favorite: boolean;
};

export type UpdateFavorite = (productId: string, favorite: boolean) => Promise<Product>;
