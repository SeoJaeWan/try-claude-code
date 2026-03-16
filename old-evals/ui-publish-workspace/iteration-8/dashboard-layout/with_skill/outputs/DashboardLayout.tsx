"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  User,
  Settings,
  Bell,
  Menu,
  X,
  ChevronLeft,
  LogOut,
  Search,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface DashboardLayoutProps {
  /** Currently active route path */
  activePath?: string;
  /** Page title shown in the header */
  pageTitle?: string;
  /** Authenticated user display info */
  user?: {
    name: string;
    email: string;
    avatarInitial?: string;
  };
  /** Main content area */
  children?: React.ReactNode;
  /** Override navigation items */
  navItems?: NavItem[];
  /** Notification count shown on bell icon */
  notificationCount?: number;
  /** Callback when a nav link is clicked */
  onNavClick?: (href: string) => void;
  /** Callback when logout is triggered */
  onLogout?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "대시보드",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/todos",
    label: "할 일",
    icon: <CheckSquare className="h-4 w-4" />,
    badge: 3,
  },
  {
    href: "/profile",
    label: "프로필",
    icon: <User className="h-4 w-4" />,
  },
  {
    href: "/settings",
    label: "설정",
    icon: <Settings className="h-4 w-4" />,
  },
];

const DEFAULT_USER = {
  name: "사용자",
  email: "user@example.com",
  avatarInitial: "U",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SidebarProps {
  navItems: NavItem[];
  activePath: string;
  collapsed: boolean;
  user: NonNullable<DashboardLayoutProps["user"]>;
  onNavClick: (href: string) => void;
  onLogout: () => void;
  onCollapse: () => void;
}

function Sidebar({
  navItems,
  activePath,
  collapsed,
  user,
  onNavClick,
  onLogout,
  onCollapse,
}: SidebarProps) {
  return (
    <aside
      className={[
        "flex flex-col border-r border-zinc-200 bg-white transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950",
        collapsed ? "w-16" : "w-64",
      ].join(" ")}
      data-testid="dashboard-sidebar"
    >
      {/* Logo / Brand */}
      <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        {!collapsed && (
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            TestApp
          </span>
        )}
        <button
          onClick={onCollapse}
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          className="ml-auto rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          <ChevronLeft
            className={[
              "h-4 w-4 transition-transform duration-300",
              collapsed ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4" data-testid="sidebar-nav">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = activePath === item.href;
            return (
              <li key={item.href}>
                <button
                  onClick={() => onNavClick(item.href)}
                  className={[
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                    collapsed ? "justify-center" : "",
                  ].join(" ")}
                  data-testid={`sidebar-nav-${item.href.replace("/", "")}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.badge != null && item.badge > 0 && (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-600" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <div
          className={[
            "flex items-center gap-3",
            collapsed ? "justify-center" : "",
          ].join(" ")}
        >
          {/* Avatar */}
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
            {user.avatarInitial ?? user.name.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {user.name}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {user.email}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onLogout}
              aria-label="로그아웃"
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-red-400"
              data-testid="sidebar-logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

interface HeaderProps {
  pageTitle: string;
  notificationCount: number;
  onMobileMenuToggle: () => void;
}

function Header({ pageTitle, notificationCount, onMobileMenuToggle }: HeaderProps) {
  return (
    <header
      className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950"
      data-testid="dashboard-header"
    >
      {/* Left: Mobile menu toggle + Page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          aria-label="모바일 메뉴 열기"
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 lg:hidden"
          data-testid="mobile-menu-toggle"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          data-testid="header-page-title"
        >
          {pageTitle}
        </h1>
      </div>

      {/* Right: Search + Notifications */}
      <div className="flex items-center gap-2">
        {/* Search (hidden on small screens) */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="검색..."
            className="h-9 w-48 rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500"
            data-testid="header-search"
          />
        </div>

        {/* Notifications */}
        <button
          aria-label="알림"
          className="relative rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          data-testid="header-notifications"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardLayout({
  activePath = "/dashboard",
  pageTitle = "대시보드",
  user = DEFAULT_USER,
  children,
  navItems = DEFAULT_NAV_ITEMS,
  notificationCount = 0,
  onNavClick,
  onLogout,
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    onNavClick?.(href);
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    onLogout?.();
  };

  return (
    <div
      className="flex h-screen overflow-hidden bg-zinc-50 font-sans dark:bg-zinc-950"
      style={{ fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" }}
      data-testid="dashboard-layout"
    >
      {/* ── Mobile sidebar overlay ── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          data-testid="sidebar-overlay"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full w-64 shadow-xl">
            <div className="flex h-full flex-col bg-white dark:bg-zinc-950">
              {/* Close button */}
              <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  TestApp
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="메뉴 닫기"
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mobile nav items */}
              <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-2">
                  {navItems.map((item) => {
                    const isActive = activePath === item.href;
                    return (
                      <li key={item.href}>
                        <button
                          onClick={() => handleNavClick(item.href)}
                          className={[
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                          ].join(" ")}
                        >
                          {item.icon}
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge != null && item.badge > 0 && (
                            <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* Mobile user section */}
              <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                    {user.avatarInitial ?? user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    aria-label="로그아웃"
                    className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar
          navItems={navItems}
          activePath={activePath}
          collapsed={sidebarCollapsed}
          user={user}
          onNavClick={handleNavClick}
          onLogout={handleLogout}
          onCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* ── Main content column ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          pageTitle={pageTitle}
          notificationCount={notificationCount}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Main content area */}
        <main
          className="flex-1 overflow-y-auto p-4 sm:p-6"
          data-testid="dashboard-main"
        >
          {children ?? (
            /* Placeholder content when no children are passed */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="mb-3 h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="mb-1 h-8 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-3 w-32 rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
              ))}
              <div className="col-span-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4 h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-4 w-4 rounded bg-zinc-200 dark:bg-zinc-700" />
                      <div className="h-3 flex-1 rounded bg-zinc-100 dark:bg-zinc-800" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
