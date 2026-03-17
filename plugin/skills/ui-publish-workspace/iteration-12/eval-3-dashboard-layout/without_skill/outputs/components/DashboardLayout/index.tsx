import { ReactNode } from "react";
import Header from "./Header";
import MobileNav from "./MobileNav";
import Sidebar from "./Sidebar";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface DashboardLayoutProps {
  children: ReactNode;
  /** Page title shown in the desktop header. Defaults to "대시보드". */
  headerTitle?: string;
  /** Optional content rendered in the header's right slot. */
  headerRight?: ReactNode;
  /** Active path used to highlight the current nav item. */
  currentPath?: string;
}

// ----------------------------------------------------------------
// DashboardLayout
// ----------------------------------------------------------------

export default function DashboardLayout({
  children,
  headerTitle = "대시보드",
  headerRight,
  currentPath = "/dashboard",
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar — hidden on mobile, visible from md */}
      <Sidebar currentPath={currentPath} />

      {/* Main area: header + content + mobile nav */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky top header */}
        <Header title={headerTitle} right={headerRight} />

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto px-4 py-6 pb-20 md:px-6 md:pb-6 lg:px-8"
          data-testid="dashboard-main"
        >
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <MobileNav currentPath={currentPath} />
      </div>
    </div>
  );
}
