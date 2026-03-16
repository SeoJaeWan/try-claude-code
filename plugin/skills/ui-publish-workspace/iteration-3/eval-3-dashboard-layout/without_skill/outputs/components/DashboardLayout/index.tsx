import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileNav from "./MobileNav";

export interface DashboardLayoutProps {
  children: ReactNode;
  headerTitle?: string;
  headerRight?: ReactNode;
  currentPath?: string;
}

export default function DashboardLayout({
  children,
  headerTitle = "대시보드",
  headerRight,
  currentPath = "/dashboard",
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar currentPath={currentPath} />

      <div className="flex flex-1 flex-col min-w-0">
        <Header title={headerTitle} right={headerRight} />
        <MobileNav currentPath={currentPath} />

        <main
          className="flex-1 overflow-y-auto px-4 py-6 pb-20 md:px-6 md:pb-6 lg:px-8"
          data-testid="dashboard-main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
