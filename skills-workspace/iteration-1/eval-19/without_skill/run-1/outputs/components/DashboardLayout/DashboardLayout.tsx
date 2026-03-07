import React, { useState, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import styles from './DashboardLayout.module.css';

export interface DashboardLayoutProps {
  /** Content to render in the main area */
  children: React.ReactNode;
  /** Navigation items for the sidebar */
  sidebarItems?: SidebarItem[];
  /** Title displayed in the header */
  title?: string;
  /** User information for the header */
  user?: UserInfo;
  /** Callback when a sidebar item is clicked */
  onNavigate?: (path: string) => void;
  /** Callback when the user requests to log out */
  onLogout?: () => void;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  path: string;
  badge?: string | number;
  children?: SidebarItem[];
}

export interface UserInfo {
  name: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
}

/**
 * DashboardLayout provides a standard layout with a collapsible sidebar,
 * a top header bar, and a scrollable main content area.
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  sidebarItems = [],
  title = 'Dashboard',
  user,
  onNavigate,
  onLogout,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  const handleNavigate = useCallback(
    (path: string) => {
      onNavigate?.(path);
      setMobileSidebarOpen(false);
    },
    [onNavigate],
  );

  return (
    <div className={styles.layout}>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        items={sidebarItems}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onNavigate={handleNavigate}
      />

      {/* Main wrapper (header + content) */}
      <div
        className={`${styles.mainWrapper} ${
          sidebarCollapsed ? styles.mainWrapperCollapsed : ''
        }`}
      >
        <Header
          title={title}
          user={user}
          onToggleSidebar={toggleSidebar}
          onToggleMobileSidebar={toggleMobileSidebar}
          onLogout={onLogout}
        />

        <main className={styles.content} role="main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
