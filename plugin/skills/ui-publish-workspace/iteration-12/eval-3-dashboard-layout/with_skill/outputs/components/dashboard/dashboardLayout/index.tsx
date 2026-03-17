import { ReactNode } from "react";
import Header from "./header";
import MobileNav from "./mobileNav";
import Sidebar from "./sidebar";

export interface DashboardLayoutProps {
  children: ReactNode;
  headerTitle?: string;
  headerRight?: ReactNode;
  currentPath?: string;
}

const DashboardLayout = ({
  children,
  headerTitle = "대시보드",
  headerRight,
  currentPath = "/dashboard",
}: DashboardLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar — hidden on mobile, visible from md */}
      <Sidebar currentPath={currentPath} />

      {/* Main area: header + content + mobile nav */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
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
};

export default DashboardLayout;
