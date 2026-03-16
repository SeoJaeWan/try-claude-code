"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  User,
  Bell,
  Menu,
  X,
  ChevronRight,
  LogOut,
} from "lucide-react";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
  notificationCount?: number;
  onLogout?: () => void;
}

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/todos", label: "할 일", icon: CheckSquare },
  { href: "/profile", label: "프로필", icon: User },
];

export default function DashboardLayout({
  children,
  userName = "사용자",
  userEmail,
  notificationCount = 0,
  onLogout,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const currentPage = navItems.find((item) => item.href === pathname)?.label ?? "대시보드";

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        data-testid="dashboard-sidebar"
        className={`
          fixed inset-y-0 left-0 z-30 flex w-64 flex-col
          border-r border-zinc-200 bg-white
          transition-transform duration-200 ease-out
          dark:border-zinc-800 dark:bg-zinc-900
          md:static md:z-auto md:translate-x-0 md:w-16 lg:w-56
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Sidebar header */}
        <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50 md:hidden lg:block">
            TestApp
          </span>
          <span className="hidden text-lg font-bold text-zinc-900 dark:text-zinc-50 md:block lg:hidden">
            T
          </span>
          <button
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="사이드바 닫기"
          >
            <X className="h-5 w-5 text-zinc-500" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setSidebarOpen(false)}
                    data-testid={`sidebar-nav-${href.slice(1)}`}
                    className={`
                      group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                      transition-colors duration-100
                      ${
                        isActive
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                      }
                    `}
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 ${
                        isActive
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                      }`}
                    />
                    <span className="md:hidden lg:block">{label}</span>
                    {isActive && (
                      <ChevronRight className="ml-auto h-4 w-4 text-blue-400 md:hidden lg:block" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar footer — user info */}
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 md:hidden lg:block">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {userName}
              </p>
              {userEmail && (
                <p className="truncate text-xs text-zinc-500">{userEmail}</p>
              )}
            </div>
            <button
              onClick={onLogout}
              aria-label="로그아웃"
              data-testid="sidebar-logout"
              className="shrink-0 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header
          data-testid="dashboard-header"
          className="flex h-14 items-center gap-4 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="사이드바 열기"
            data-testid="sidebar-toggle"
          >
            <Menu className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          </button>

          {/* Page title */}
          <h1
            className="flex-1 text-base font-semibold text-zinc-900 dark:text-zinc-50 truncate"
            data-testid="header-page-title"
          >
            {currentPage}
          </h1>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button
              className="relative rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 transition-colors"
              aria-label="알림"
              data-testid="header-notifications"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>

            {/* User avatar (desktop shortcut) */}
            <div
              className="hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              data-testid="header-avatar"
              aria-label={userName}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main
          data-testid="dashboard-main"
          className="flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
