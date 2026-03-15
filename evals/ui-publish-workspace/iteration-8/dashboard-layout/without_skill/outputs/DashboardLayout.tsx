"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
  pageTitle?: string;
  onLogout?: () => void;
}

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "대시보드",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    href: "/todos",
    label: "할 일",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "프로필",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
];

export default function DashboardLayout({
  children,
  userName = "사용자",
  userEmail = "user@example.com",
  pageTitle = "대시보드",
  onLogout,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-900",
          "md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        data-testid="sidebar"
      >
        {/* Sidebar header / logo */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <Link
            href="/"
            className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
            data-testid="sidebar-logo"
          >
            TestApp
          </Link>
          {/* Close button — mobile only */}
          <button
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="사이드바 닫기"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="사이드바 내비게이션">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={[
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                    ].join(" ")}
                    data-testid={`sidebar-nav-${item.href.slice(1)}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section at bottom */}
        <div className="shrink-0 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50" data-testid="sidebar-user-name">
                {userName}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400" data-testid="sidebar-user-email">
                {userEmail}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
              aria-label="로그아웃"
              data-testid="sidebar-logout"
              title="로그아웃"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header
          className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900"
          data-testid="dashboard-header"
        >
          {/* Left: hamburger + page title */}
          <div className="flex items-center gap-3">
            <button
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="사이드바 열기"
              data-testid="sidebar-toggle"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
              data-testid="page-title"
            >
              {pageTitle}
            </h1>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button
              className="relative rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              aria-label="알림"
              data-testid="header-notifications"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {/* Badge */}
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
            </button>

            {/* Avatar — desktop shortcut */}
            <div
              className="hidden h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white md:flex"
              aria-hidden="true"
            >
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          data-testid="dashboard-main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
