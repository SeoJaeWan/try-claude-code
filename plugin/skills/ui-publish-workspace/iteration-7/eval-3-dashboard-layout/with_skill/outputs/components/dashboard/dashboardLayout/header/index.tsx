import Link from "next/link";
import { ReactNode } from "react";

export interface HeaderProps {
  headerTitle?: string;
  headerRight?: ReactNode;
}

const Header = ({ headerTitle = "대시보드", headerRight }: HeaderProps) => (
  <header
    className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 md:px-6 dark:border-zinc-800 dark:bg-zinc-900"
    data-testid="dashboard-header"
  >
    <div className="flex items-center gap-3">
      {/* Mobile: logo visible when sidebar is hidden */}
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

    <div className="flex items-center gap-3" data-testid="dashboard-header-right">
      {headerRight ?? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="알림"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700" aria-label="사용자 아바타" />
        </div>
      )}
    </div>
  </header>
);

export default Header;
