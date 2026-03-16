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
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative h-48 w-full bg-zinc-100 dark:bg-zinc-800">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 300px"
        />
      </div>
      <div className="p-4">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{name}</p>
        <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">
          {currency}{price.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
