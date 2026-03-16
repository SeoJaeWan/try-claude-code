"use client";

import Image from "next/image";

export interface ProductCardProps {
  imageUrl: string;
  imageAlt?: string;
  name: string;
  price: number;
  currency?: string;
  badge?: string;
  testId?: string;
}

const ProductCard = ({
  imageUrl,
  imageAlt = "",
  name,
  price,
  currency = "₩",
  badge,
  testId,
}: ProductCardProps) => {
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
      data-testid={testId}
    >
      {/* Product Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        <Image
          src={imageUrl}
          alt={imageAlt || name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {badge && (
          <span className="absolute left-3 top-3 rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">
            {badge}
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-50">
          {name}
        </h3>
        <p className="mt-auto text-base font-bold text-zinc-900 dark:text-zinc-50">
          {currency}
          {price.toLocaleString("ko-KR")}
        </p>
      </div>
    </div>
  );
};

export default ProductCard;
