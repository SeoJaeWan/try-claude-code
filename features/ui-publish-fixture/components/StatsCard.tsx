"use client";

export default function StatsCard({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900" data-testid={testId}>
      <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  );
}
