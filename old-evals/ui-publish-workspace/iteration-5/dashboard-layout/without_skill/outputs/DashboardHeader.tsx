"use client";

export interface DashboardHeaderProps {
  title?: string;
  description?: string;
  onMenuToggle?: () => void;
  actions?: React.ReactNode;
}

export default function DashboardHeader({
  title = "대시보드",
  description,
  onMenuToggle,
  actions,
}: DashboardHeaderProps) {
  return (
    <header
      data-testid="dashboard-header"
      className="flex h-14 items-center gap-4 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuToggle}
        aria-label="모바일 메뉴 열기"
        className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 md:hidden dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        data-testid="mobile-menu-toggle"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Title area */}
      <div className="flex-1 min-w-0">
        <h1
          data-testid="dashboard-header-title"
          className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          {title}
        </h1>
        {description && (
          <p className="truncate text-xs text-zinc-500">{description}</p>
        )}
      </div>

      {/* Right-side actions */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}

      {/* Default notification bell when no actions provided */}
      {!actions && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            aria-label="알림"
            className="relative rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-600" />
          </button>
          <button
            aria-label="설정"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      )}
    </header>
  );
}
