"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems?: NavItem[];
  appName?: string;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

const defaultNavItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "대시보드",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/todos",
    label: "할 일",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "프로필",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "설정",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function DashboardLayout({
  children,
  navItems = defaultNavItems,
  appName = "TestApp",
  userName = "사용자",
  userEmail = "user@example.com",
  onLogout,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950" data-testid="dashboard-layout">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-950 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="dashboard-sidebar"
      >
        {/* Sidebar header / logo */}
        <div className="flex h-16 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
          <Link
            href="/"
            className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
            data-testid="sidebar-logo"
          >
            {appName}
          </Link>
          {/* Close button (mobile only) */}
          <button
            className="ml-auto md:hidden p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            onClick={() => setSidebarOpen(false)}
            aria-label="사이드바 닫기"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" data-testid="sidebar-nav">
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
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                    }`}
                    data-testid={`sidebar-nav-${item.href.replace(/\//g, "").replace(/^\//, "")}`}
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

        {/* Sidebar footer / user info */}
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-400">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{userName}</p>
              <p className="truncate text-xs text-zinc-500">{userEmail}</p>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                aria-label="로그아웃"
                data-testid="sidebar-logout"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main area (header + content) */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header
          className="flex h-16 items-center border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6"
          data-testid="dashboard-header"
        >
          {/* Mobile hamburger */}
          <button
            className="mr-3 rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="사이드바 열기"
            data-testid="sidebar-toggle"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Page title (derived from pathname) */}
          <PageTitle pathname={pathname} navItems={navItems} />

          {/* Header right actions */}
          <div className="ml-auto flex items-center gap-2">
            {/* Notification bell */}
            <button
              className="relative rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              aria-label="알림"
              data-testid="header-notifications"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Notification badge */}
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>

            {/* User avatar */}
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 dark:bg-blue-950 dark:text-blue-400"
              aria-label="사용자 메뉴"
              data-testid="header-user-menu"
            >
              {userName.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        {/* Main content */}
        <main
          className="flex-1 overflow-y-auto p-4 sm:p-6"
          data-testid="dashboard-main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function PageTitle({ pathname, navItems }: { pathname: string; navItems: NavItem[] }) {
  const match = navItems.find((item) => item.href === pathname);
  const title = match?.label ?? "대시보드";

  return (
    <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50" data-testid="header-page-title">
      {title}
    </h1>
  );
}
