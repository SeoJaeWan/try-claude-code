"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// --- Icons (inline SVG, no external dependency needed) ---

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function IconTodo({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconProfile({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function IconMenu({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

// --- Nav item definitions ---

const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드", icon: IconDashboard },
  { href: "/todos", label: "할 일", icon: IconTodo },
  { href: "/profile", label: "프로필", icon: IconProfile },
] as const;

// --- Types ---

export interface DashboardLayoutProps {
  children: React.ReactNode;
  /** Page title shown in the header */
  pageTitle?: string;
  /** User display name for the header greeting */
  userName?: string;
  /** User email shown in the sidebar footer */
  userEmail?: string;
  /** Callback when the notification bell is clicked */
  onNotificationClick?: () => void;
  /** Notification count badge */
  notificationCount?: number;
}

// --- Sidebar Component ---

function Sidebar({
  isOpen,
  onClose,
  pathname,
}: {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
}) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        data-testid="sidebar"
        className={[
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white shadow-lg transition-transform duration-300 dark:bg-zinc-900",
          "md:relative md:translate-x-0 md:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-700">
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50" data-testid="sidebar-logo">
            TestApp
          </span>
          <button
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 md:hidden"
            onClick={onClose}
            aria-label="사이드바 닫기"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" data-testid="sidebar-nav">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            메뉴
          </p>
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    data-testid={`sidebar-nav-${href.slice(1)}`}
                    className={[
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                    ].join(" ")}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <p className="text-xs text-zinc-400" data-testid="sidebar-version">
            v0.1.0
          </p>
        </div>
      </aside>
    </>
  );
}

// --- Header Component ---

function Header({
  pageTitle,
  userName,
  onMenuToggle,
  onNotificationClick,
  notificationCount,
}: {
  pageTitle?: string;
  userName?: string;
  onMenuToggle: () => void;
  onNotificationClick?: () => void;
  notificationCount?: number;
}) {
  return (
    <header
      className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-zinc-200 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900"
      data-testid="dashboard-header"
    >
      {/* Mobile hamburger */}
      <button
        className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 md:hidden"
        onClick={onMenuToggle}
        aria-label="메뉴 열기"
        data-testid="header-menu-toggle"
      >
        <IconMenu className="h-5 w-5" />
      </button>

      {/* Page title */}
      <div className="flex-1">
        {pageTitle && (
          <h1
            className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
            data-testid="header-page-title"
          >
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Search bar (md+) */}
      <div className="hidden items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-800 md:flex">
        <IconSearch className="h-4 w-4 text-zinc-400" />
        <input
          type="search"
          placeholder="검색..."
          className="w-48 bg-transparent text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200"
          data-testid="header-search"
        />
      </div>

      {/* Notification bell */}
      <button
        className="relative rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        onClick={onNotificationClick}
        aria-label="알림"
        data-testid="header-notifications"
      >
        <IconBell className="h-5 w-5" />
        {notificationCount != null && notificationCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white"
            data-testid="notification-badge"
          >
            {notificationCount > 9 ? "9+" : notificationCount}
          </span>
        )}
      </button>

      {/* User avatar */}
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
        data-testid="header-avatar"
        title={userName}
      >
        {userName ? userName.slice(0, 1).toUpperCase() : "U"}
      </div>
    </header>
  );
}

// --- Main DashboardLayout Component ---

/**
 * DashboardLayout 컴포넌트
 * 사이드바, 헤더, 메인 콘텐츠 영역을 포함하는 반응형 대시보드 레이아웃
 */
export default function DashboardLayout({
  children,
  pageTitle,
  userName,
  userEmail,
  onNotificationClick,
  notificationCount,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div
      className="flex h-screen overflow-hidden bg-zinc-50 font-sans dark:bg-zinc-950"
      data-testid="dashboard-layout"
    >
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pathname={pathname}
      />

      {/* Right side: header + content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          pageTitle={pageTitle}
          userName={userName}
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          onNotificationClick={onNotificationClick}
          notificationCount={notificationCount}
        />

        {/* Main content area */}
        <main
          className="flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8"
          data-testid="dashboard-main"
        >
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
