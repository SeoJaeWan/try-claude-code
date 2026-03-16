"use client";

type FilterType = "all" | "active" | "completed";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  filter: FilterType;
  onFilterChange: (v: FilterType) => void;
}

const filters: { value: FilterType; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "active", label: "진행중" },
  { value: "completed", label: "완료" },
];

export default function SearchFilter({ search, onSearchChange, filter, onFilterChange }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="할 일 검색..."
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        data-testid="search-input"
      />
      <div className="flex gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-800">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-blue-600 text-white"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
            data-testid={`filter-${f.value}`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
