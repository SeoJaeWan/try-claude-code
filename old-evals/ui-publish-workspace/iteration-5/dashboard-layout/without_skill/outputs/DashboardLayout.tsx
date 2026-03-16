"use client";

import { useState } from "react";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import type { SidebarNavItem } from "./DashboardSidebar";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  /** Current page title shown in the header */
  pageTitle?: string;
  /** Subtitle/description shown below the page title */
  pageDescription?: string;
  /** User display name shown in the sidebar */
  userName?: string;
  /** User email shown in the sidebar */
  userEmail?: string;
  /** Sidebar navigation items */
  navItems?: SidebarNavItem[];
  /** Callback for logout action */
  onLogout?: () => void;
  /** Optional header right-side action slot */
  headerActions?: React.ReactNode;
}

export default function DashboardLayout({
  children,
  pageTitle = "대시보드",
  pageDescription,
  userName = "사용자",
  userEmail,
  navItems,
  onLogout,
  headerActions,
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      data-testid="dashboard-layout"
      className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950"
    >
      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex md:flex-col md:shrink-0">
        <DashboardSidebar
          navItems={navItems}
          userName={userName}
          userEmail={userEmail}
          onLogout={onLogout}
        />
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-zinc-900/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="relative z-50 flex w-64 flex-col">
            <DashboardSidebar
              navItems={navItems}
              userName={userName}
              userEmail={userEmail}
              onLogout={onLogout}
            />
          </div>
        </div>
      )}

      {/* ── Right column: header + main ── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <DashboardHeader
          title={pageTitle}
          description={pageDescription}
          onMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
          actions={headerActions}
        />

        {/* Main content area */}
        <main
          data-testid="dashboard-main"
          className="flex-1 overflow-y-auto p-4 md:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
