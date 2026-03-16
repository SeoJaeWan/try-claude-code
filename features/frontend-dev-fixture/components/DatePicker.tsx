"use client";

interface Props {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  testId?: string;
}

export default function DatePicker({ label, value, onChange, testId }: Props) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        data-testid={testId || "date-picker"}
      />
    </div>
  );
}
