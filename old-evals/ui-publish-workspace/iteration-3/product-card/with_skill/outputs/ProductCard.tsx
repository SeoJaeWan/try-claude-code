import Image from "next/image";

export interface ProductCardProps {
  imageUrl: string;
  imageAlt?: string;
  name: string;
  price: number;
  currency?: string;
}

export default function ProductCard({
  imageUrl,
  imageAlt = "",
  name,
  price,
  currency = "KRW",
}: ProductCardProps) {
  const formattedPrice =
    currency === "KRW"
      ? `${price.toLocaleString("ko-KR")}원`
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
        }).format(price);

  return (
    <div className="group w-full max-w-xs overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {/* Product Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        <Image
          src={imageUrl}
          alt={imageAlt || name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 320px"
        />
      </div>

      {/* Product Info */}
      <div className="px-4 py-3">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{name}</p>
        <p className="mt-1 text-base font-bold text-blue-600 dark:text-blue-400">{formattedPrice}</p>
      </div>
    </div>
  );
}
