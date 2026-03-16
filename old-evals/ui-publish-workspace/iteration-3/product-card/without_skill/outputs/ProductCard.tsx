"use client";

import Image from "next/image";

export interface ProductCardProps {
  imageUrl: string;
  name: string;
  price: number;
  currency?: string;
}

export default function ProductCard({
  imageUrl,
  name,
  price,
  currency = "₩",
}: ProductCardProps) {
  return (
    <div className="w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative h-48 w-full bg-zinc-100 dark:bg-zinc-800">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          sizes="256px"
        />
      </div>
      <div className="p-4">
        <h3 className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {name}
        </h3>
        <p className="mt-1 text-base font-bold text-blue-600 dark:text-blue-400">
          {currency}
          {price.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
