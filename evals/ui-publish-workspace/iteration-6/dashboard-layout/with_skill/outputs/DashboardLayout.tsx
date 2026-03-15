"use client";

import { useState } from "react";
import Link from "next/link";
import { ReactNode } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  User,
  Bell,
  Settings,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";

export interface DashboardLayoutProps {
  children: ReactNode;
  headerTitle?: string;
  headerRight?: ReactNode;
  currentPath?: string;
}

const NAV_LINKS = [
  {
    href: "/dashboard",
    label: "대시보드",
    icon: <LayoutDashboard className="h-5 w-5" aria-hidden="true" />,
  },
  {
    href: "/todos",
    label: "할 일",
    icon: <CheckSquare className="h-5 w-5" aria-hidden="true" />,
  },
  {
    href: "/profile",
    label: "프로필",
    icon: <User className="h-5 w-5" aria-hidden="true" />,
  },
] as const;

export default function DashboardLayout({
  children,
  headerTitle = "대시보드",
  headerRight,
  currentPath = "/dashboard",
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 transition-[width] duration-200 ease-in-out ${
          sidebarCollapsed ? "md:w-16 lg:w-16" : "md:w-60 lg:w-64"
        }`}
        data-testid="dashboard-sidebar"
      >
        {/* Logo row */}
        <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          {!sidebarCollapsed && (
            <Link
              href="/"
              className="text-base font-bold text-zinc-900 dark:text-zinc-50 truncate"
              data-testid="sidebar-logo"
            >
              TestApp
            </Link>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="ml-auto rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label={sidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform duration-200 ${sidebarCollapsed ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 px-2 py-4" aria-label="메인 내비게이션">
          {NAV_LINKS.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={sidebarCollapsed ? link.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
                data-testid={`sidebar-nav-${link.href.slice(1)}`}
              >
                {link.icon}
                {!sidebarCollapsed && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-zinc-200 px-2 py-4 dark:border-zinc-800">
          <button
            type="button"
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors ${
              sidebarCollapsed ? "justify-center px-0" : ""
            }`}
            title={sidebarCollapsed ? "설정" : undefined}
            aria-label="설정"
          >
            <Settings className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            {!sidebarCollapsed && <span>설정</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile Drawer Overlay ── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-hidden="true"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <div
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:hidden transform transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="dashboard-mobile-drawer"
        aria-modal="true"
        role="dialog"
        aria-label="내비게이션 메뉴"
      >
        {/* Drawer header */}
        <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <Link
            href="/"
            className="text-base font-bold text-zinc-900 dark:text-zinc-50"
            onClick={() => setMobileMenuOpen(false)}
          >
            TestApp
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="메뉴 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex flex-1 flex-col gap-1 px-2 py-4" aria-label="모바일 내비게이션">
          {NAV_LINKS.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                }`}
                data-testid={`mobile-drawer-nav-${link.href.slice(1)}`}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Drawer footer */}
        <div className="border-t border-zinc-200 px-2 py-4 dark:border-zinc-800">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
            aria-label="설정"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
            설정
          </button>
        </div>
      </div>

      {/* ── Main area: header + content ── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header
          className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900"
          data-testid="dashboard-header"
        >
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              type="button"
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 md:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="메뉴 열기"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Mobile logo */}
            <Link
              href="/"
              className="text-base font-bold text-zinc-900 dark:text-zinc-50 md:hidden"
              data-testid="header-logo-mobile"
            >
              TestApp
            </Link>

            {/* Desktop page title */}
            <h1
              className="hidden text-base font-semibold text-zinc-900 dark:text-zinc-50 md:block"
              data-testid="dashboard-header-title"
            >
              {headerTitle}
            </h1>
          </div>

          {/* Header right slot */}
          <div className="flex items-center gap-2" data-testid="dashboard-header-right">
            {headerRight ?? (
              <>
                {/* Notification bell */}
                <button
                  type="button"
                  className="relative rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
                  aria-label="알림"
                >
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  {/* Unread badge */}
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                </button>

                {/* User avatar */}
                <button
                  type="button"
                  className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 ring-2 ring-transparent hover:ring-blue-400 transition-all focus:outline-none focus:ring-blue-500"
                  aria-label="사용자 메뉴"
                />
              </>
            )}
          </div>
        </header>

        {/* Main content */}
        <main
          className="flex-1 overflow-y-auto px-4 py-6 pb-24 md:px-6 md:pb-6 lg:px-8"
          data-testid="dashboard-main"
        >
          {children}
        </main>

        {/* ── Mobile bottom nav ── */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-zinc-200 bg-white md:hidden dark:border-zinc-800 dark:bg-zinc-900"
          data-testid="dashboard-mobile-nav"
          aria-label="하단 내비게이션"
        >
          {NAV_LINKS.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
                data-testid={`mobile-nav-${link.href.slice(1)}`}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
