import DashboardLayout from "./DashboardLayout";

export default function DashboardPage() {
  return (
    <DashboardLayout headerTitle="대시보드" currentPath="/dashboard">
      <div className="space-y-6">
        {/* Page heading */}
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">안녕하세요!</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">오늘도 좋은 하루 되세요.</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "전체 할 일", value: "12", change: "+2", positive: true },
            { label: "완료", value: "8", change: "+3", positive: true },
            { label: "진행중", value: "4", change: "-1", positive: false },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</p>
              <p
                className={`mt-1 text-xs font-medium ${
                  stat.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                }`}
              >
                {stat.change} 이번 주
              </p>
            </div>
          ))}
        </div>

        {/* Content area placeholder */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">최근 활동</h3>
          <ul className="mt-4 space-y-3">
            {[
              "프로젝트 기획서 작성 완료",
              "주간 회의 준비",
              "디자인 피드백 반영",
              "코드 리뷰 진행",
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400"
              >
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
