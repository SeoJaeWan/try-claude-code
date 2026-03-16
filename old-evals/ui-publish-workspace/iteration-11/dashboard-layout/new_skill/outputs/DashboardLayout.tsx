"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  User,
  Settings,
  Bell,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

export interface DashboardLayoutProps {
  children: ReactNode;
  headerTitle?: string;
  headerRight?: ReactNode;
  currentPath?: string;
}

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/todos", label: "할 일", icon: CheckSquare },
  { href: "/profile", label: "프로필", icon: User },
  { href: "/settings", label: "설정", icon: Settings },
];

export default function DashboardLayout({
  children,
  headerTitle = "대시보드",
  headerRight,
  currentPath = "/dashboard",
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuToggle = () => setSidebarOpen((prev) => !prev);
  const handleOverlayClick = () => setSidebarOpen(false);
  const handleNavClick = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          aria-hidden="true"
          onClick={handleOverlayClick}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-zinc-200 bg-white",
          "transform transition-transform duration-300 ease-in-out",
          "dark:border-zinc-800 dark:bg-zinc-900",
          "md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        data-testid="dashboard-sidebar"
        aria-label="사이드바 내비게이션"
      >
        {/* Sidebar header */}
        <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-5 dark:border-zinc-800">
          <Link
            href="/"
            className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
            data-testid="sidebar-logo"
          >
            TestApp
          </Link>
          <button
            type="button"
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 md:hidden"
            onClick={handleMenuToggle}
            aria-label="사이드바 닫기"
            data-testid="sidebar-close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="주요 내비게이션">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = currentPath === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={handleNavClick}
                className={[
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                ].join(" ")}
                aria-current={isActive ? "page" : undefined}
                data-testid={`sidebar-nav-${href.slice(1)}`}
              >
                <Icon
                  className={[
                    "h-5 w-5 shrink-0 transition-colors",
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300",
                  ].join(" ")}
                  aria-hidden="true"
                />
                <span className="flex-1">{label}</span>
                {isActive && (
                  <ChevronRight className="h-4 w-4 shrink-0 text-blue-400 dark:text-blue-500" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-zinc-200 px-3 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" aria-label="사용자 아바타" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">사용자 이름</p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">user@example.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area: header + content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header
          className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 md:px-6"
          data-testid="dashboard-header"
        >
          {/* Left: hamburger (mobile) + title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 md:hidden"
              onClick={handleMenuToggle}
              aria-label="사이드바 열기"
              data-testid="header-menu-toggle"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link
              href="/"
              className="text-base font-bold text-zinc-900 dark:text-zinc-50 md:hidden"
              data-testid="header-logo-mobile"
            >
              TestApp
            </Link>

            <h1
              className="hidden text-base font-semibold text-zinc-900 dark:text-zinc-50 md:block"
              data-testid="dashboard-header-title"
            >
              {headerTitle}
            </h1>
          </div>

          {/* Right: header slot or default actions */}
          <div className="flex items-center gap-2" data-testid="dashboard-header-right">
            {headerRight ?? (
              <>
                <button
                  type="button"
                  className="relative rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  aria-label="알림"
                  data-testid="header-notifications"
                >
                  <Bell className="h-5 w-5" />
                  {/* Notification badge */}
                  <span
                    className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-500"
                    aria-label="새 알림"
                  />
                </button>
                <div
                  className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700"
                  aria-label="사용자 아바타"
                  data-testid="header-avatar"
                />
              </>
            )}
          </div>
        </header>

        {/* Main content */}
        <main
          className="flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8"
          data-testid="dashboard-main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
