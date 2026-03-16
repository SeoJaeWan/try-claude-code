"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  children: ReactNode;
  headerTitle?: string;
  headerRight?: ReactNode;
  currentPath?: string;
}

interface NavLink {
  href: string;
  label: string;
  icon: ReactNode;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconHome = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const IconTodos = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
    />
  </svg>
);

const IconProfile = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const IconSettings = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const IconBell = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
);

const IconMenu = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const IconX = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ─── Data ─────────────────────────────────────────────────────────────────────

const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "대시보드", icon: <IconHome /> },
  { href: "/todos", label: "할 일", icon: <IconTodos /> },
  { href: "/profile", label: "프로필", icon: <IconProfile /> },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const SidebarLogo = () => (
  <div className="flex h-14 items-center border-b border-zinc-200 px-5 dark:border-zinc-800">
    <Link
      href="/"
      className="text-base font-bold text-zinc-900 dark:text-zinc-50"
      data-testid="sidebar-logo"
    >
      TestApp
    </Link>
  </div>
);

const SidebarNav = ({ currentPath }: { currentPath: string }) => (
  <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
    {NAV_LINKS.map((link) => {
      const isActive = currentPath === link.href;
      return (
        <Link
          key={link.href}
          href={link.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive
              ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          }`}
          data-testid={`sidebar-nav-${link.href.slice(1)}`}
        >
          {link.icon}
          {link.label}
        </Link>
      );
    })}
  </nav>
);

const SidebarFooter = () => (
  <div className="border-t border-zinc-200 px-3 py-4 dark:border-zinc-800">
    <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
      <IconSettings />
      설정
    </div>
  </div>
);

const Sidebar = ({ currentPath }: { currentPath: string }) => (
  <aside
    className="hidden md:flex md:w-60 lg:w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    data-testid="dashboard-sidebar"
  >
    <SidebarLogo />
    <SidebarNav currentPath={currentPath} />
    <SidebarFooter />
  </aside>
);

const MobileSidebar = ({
  isOpen,
  currentPath,
  onClose,
}: {
  isOpen: boolean;
  currentPath: string;
  onClose: () => void;
}) => (
  <>
    {/* Backdrop */}
    {isOpen && (
      <div
        className="fixed inset-0 z-20 bg-black/40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
    )}

    {/* Drawer */}
    <div
      className={`fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 dark:border-zinc-800 dark:bg-zinc-900 md:hidden ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-5 dark:border-zinc-800">
        <Link href="/" className="text-base font-bold text-zinc-900 dark:text-zinc-50">
          TestApp
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="메뉴 닫기"
        >
          <IconX />
        </button>
      </div>
      <SidebarNav currentPath={currentPath} />
      <SidebarFooter />
    </div>
  </>
);

const HeaderDefaultRight = () => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      aria-label="알림"
    >
      <IconBell />
    </button>
    <div
      className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700"
      aria-label="사용자 아바타"
    />
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const DashboardLayout = (props: DashboardLayoutProps) => {
  const {
    children,
    headerTitle = "대시보드",
    headerRight,
    currentPath = "/dashboard",
  } = props;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleToggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);
  const handleCloseMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop sidebar */}
      <Sidebar currentPath={currentPath} />

      {/* Mobile sidebar drawer */}
      <MobileSidebar
        isOpen={isMobileMenuOpen}
        currentPath={currentPath}
        onClose={handleCloseMobileMenu}
      />

      {/* Right column: header + main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header
          className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 md:px-6 dark:border-zinc-800 dark:bg-zinc-900"
          data-testid="dashboard-header"
        >
          {/* Left: hamburger (mobile) + page title (desktop) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleMobileMenu}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 md:hidden dark:hover:bg-zinc-800"
              aria-label="메뉴 열기"
            >
              <IconMenu />
            </button>

            <h1
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
              data-testid="dashboard-header-title"
            >
              {headerTitle}
            </h1>
          </div>

          {/* Right: custom slot or default controls */}
          <div className="flex items-center gap-3" data-testid="dashboard-header-right">
            {headerRight ?? <HeaderDefaultRight />}
          </div>
        </header>

        {/* Mobile bottom navigation */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-zinc-200 bg-white md:hidden dark:border-zinc-800 dark:bg-zinc-900"
          data-testid="dashboard-mobile-nav"
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

        {/* Main content area */}
        <main
          className="flex-1 overflow-y-auto px-4 py-6 pb-20 md:px-6 md:pb-6 lg:px-8"
          data-testid="dashboard-main"
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
