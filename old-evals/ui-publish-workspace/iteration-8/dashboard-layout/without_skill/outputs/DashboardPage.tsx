"use client";

import DashboardLayout from "./DashboardLayout";

export default function DashboardPage() {
  return (
    <DashboardLayout
      userName="홍길동"
      userEmail="hong@example.com"
      pageTitle="대시보드"
      onLogout={() => {}}
    >
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "전체 할 일", value: "24", change: "+3", up: true },
          { label: "완료", value: "18", change: "+5", up: true },
          { label: "진행 중", value: "4", change: "-1", up: false },
          { label: "미완료", value: "2", change: "-2", up: true },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</p>
            <p className={`mt-1 text-xs font-medium ${stat.up ? "text-green-600" : "text-red-600"}`}>
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
              { title: "프로젝트 기획서 작성", done: true, priority: "높음" },
              { title: "디자인 시스템 구축", done: false, priority: "높음" },
              { title: "API 연동 작업", done: false, priority: "중간" },
              { title: "코드 리뷰 진행", done: true, priority: "낮음" },
              { title: "테스트 케이스 작성", done: false, priority: "중간" },
            ].map((todo) => (
              <li key={todo.title} className="flex items-center gap-3 px-5 py-3.5">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    todo.done
                      ? "border-blue-600 bg-blue-600"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {todo.done && (
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className={`flex-1 text-sm ${todo.done ? "text-zinc-400 line-through" : "text-zinc-700 dark:text-zinc-300"}`}>
                  {todo.title}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    todo.priority === "높음"
                      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                      : todo.priority === "중간"
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                      : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                  }`}
                >
                  {todo.priority}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">빠른 작업</h2>
          </div>
          <div className="space-y-2 p-4">
            {[
              { label: "새 할 일 추가", icon: "+" },
              { label: "프로필 수정", icon: "✎" },
              { label: "알림 설정", icon: "🔔" },
            ].map((action) => (
              <button
                key={action.label}
                className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-left text-sm text-zinc-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-400"
              >
                <span className="text-base">{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
