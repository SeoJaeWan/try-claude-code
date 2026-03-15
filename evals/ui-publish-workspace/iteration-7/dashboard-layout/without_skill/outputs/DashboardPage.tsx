"use client";

import DashboardLayout from "./DashboardLayout";

export default function DashboardPage() {
  return (
    <DashboardLayout
      userName="홍길동"
      userEmail="hong@example.com"
      pageTitle="대시보드"
    >
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "전체 할 일", value: "24", change: "+3", up: true },
          { label: "완료됨", value: "18", change: "+5", up: true },
          { label: "진행 중", value: "4", change: "-1", up: false },
          { label: "기한 초과", value: "2", change: "+2", up: false },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</p>
            <p className={`mt-1 text-xs font-medium ${stat.up ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {stat.change} 이번 주
            </p>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent todos */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">최근 할 일</h2>
            <button className="text-xs text-blue-600 hover:underline dark:text-blue-400">전체 보기</button>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {[
              { title: "디자인 시스템 문서 작성", done: true, due: "2026-03-10" },
              { title: "API 연동 테스트", done: false, due: "2026-03-16" },
              { title: "코드 리뷰 완료", done: false, due: "2026-03-17" },
              { title: "배포 환경 설정", done: true, due: "2026-03-12" },
              { title: "주간 회의 준비", done: false, due: "2026-03-18" },
            ].map((todo) => (
              <li key={todo.title} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    todo.done
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {todo.done && (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className={`flex-1 text-sm ${todo.done ? "text-zinc-400 line-through dark:text-zinc-500" : "text-zinc-800 dark:text-zinc-200"}`}>
                  {todo.title}
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{todo.due}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Activity feed */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">최근 활동</h2>
          </div>
          <ul className="divide-y divide-zinc-100 px-5 dark:divide-zinc-800">
            {[
              { action: "할 일 완료", item: "디자인 시스템 문서 작성", time: "2시간 전" },
              { action: "할 일 추가", item: "API 연동 테스트", time: "4시간 전" },
              { action: "할 일 완료", item: "배포 환경 설정", time: "어제" },
              { action: "할 일 수정", item: "주간 회의 준비", time: "어제" },
            ].map((activity, i) => (
              <li key={i} className="py-3">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{activity.action}</p>
                <p className="mt-0.5 text-sm text-zinc-800 dark:text-zinc-200">{activity.item}</p>
                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{activity.time}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
