"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

const navItems = [
  {
    href: "/dashboard",
    label: "대시보드",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
];

export default function DashboardLayout({
  children,
  userName,
  userEmail,
  onLogout,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white shadow-lg transition-transform duration-300 dark:bg-zinc-900 md:relative md:translate-x-0 md:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="dashboard-sidebar"
      >
        {/* Sidebar header / Logo */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <Link
            href="/"
            className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
            data-testid="sidebar-logo"
          >
            TestApp
          </Link>
          <button
            className="md:hidden p-1 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            onClick={() => setSidebarOpen(false)}
            aria-label="사이드바 닫기"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="사이드바 내비게이션">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                    }`}
                    data-testid={`sidebar-nav-${item.href.slice(1)}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className={isActive ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500"}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar footer / User info */}
        <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
          {(userName || userEmail) && (
            <div className="mb-3">
              {userName && (
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50" data-testid="sidebar-user-name">
                  {userName}
                </p>
              )}
              {userEmail && (
                <p className="text-xs text-zinc-500 truncate" data-testid="sidebar-user-email">
                  {userEmail}
                </p>
              )}
            </div>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 transition-colors"
              data-testid="sidebar-logout"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              로그아웃
            </button>
          )}
        </div>
      </aside>

      {/* Main area (header + content) */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header
          className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900"
          data-testid="dashboard-header"
        >
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 transition-colors"
            onClick={() => setSidebarOpen(true)}
            data-testid="sidebar-toggle"
            aria-label="사이드바 열기"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Page title (derived from current path) */}
          <div className="hidden md:block">
            <PageTitle pathname={pathname} />
          </div>

          {/* Mobile page title */}
          <div className="md:hidden flex-1 ml-2">
            <PageTitle pathname={pathname} />
          </div>

          {/* Header right actions */}
          <div className="flex items-center gap-3">
            {/* Notification bell placeholder */}
            <button
              className="relative p-2 rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 transition-colors"
              aria-label="알림"
              data-testid="header-notifications"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {/* Notification badge */}
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>

            {/* User avatar */}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white select-none"
              data-testid="header-user-avatar"
              title={userName}
            >
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
          </div>
        </header>

        {/* Main content */}
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

function PageTitle({ pathname }: { pathname: string }) {
  const labels: Record<string, string> = {
    "/dashboard": "대시보드",
    "/todos": "할 일",
    "/profile": "프로필",
  };

  const title = labels[pathname] ?? "페이지";

  return (
    <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50" data-testid="header-page-title">
      {title}
    </h1>
  );
}
