import React, { useState } from 'react';
import type { SidebarItem } from './DashboardLayout';
import styles from './Sidebar.module.css';

export interface SidebarProps {
  items: SidebarItem[];
  collapsed: boolean;
  mobileOpen: boolean;
  onNavigate: (path: string) => void;
  activePath?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  collapsed,
  mobileOpen,
  onNavigate,
  activePath,
}) => {
  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${
        mobileOpen ? styles.mobileOpen : ''
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Brand / Logo */}
      <div className={styles.brand}>
        <div className={styles.logo}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <rect width="32" height="32" rx="8" fill="#4F46E5" />
            <path d="M10 16L14 20L22 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {!collapsed && <span className={styles.brandName}>MyApp</span>}
      </div>

      {/* Navigation items */}
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {items.map((item) => (
            <SidebarNavItem
              key={item.id}
              item={item}
              collapsed={collapsed}
              activePath={activePath}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>

      {/* Footer area */}
      {!collapsed && (
        <div className={styles.footer}>
          <span className={styles.version}>v1.0.0</span>
        </div>
      )}
    </aside>
  );
};

interface SidebarNavItemProps {
  item: SidebarItem;
  collapsed: boolean;
  activePath?: string;
  onNavigate: (path: string) => void;
  depth?: number;
}

const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  item,
  collapsed,
  activePath,
  onNavigate,
  depth = 0,
}) => {
  const [expanded, setExpanded] = useState(false);
  const isActive = activePath === item.path;
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setExpanded((prev) => !prev);
    } else {
      onNavigate(item.path);
    }
  };

  return (
    <li>
      <button
        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
        style={{ paddingLeft: `${16 + depth * 16}px` }}
        onClick={handleClick}
        title={collapsed ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
      >
        {item.icon && <span className={styles.navIcon}>{item.icon}</span>}
        {!collapsed && (
          <>
            <span className={styles.navLabel}>{item.label}</span>
            {item.badge !== undefined && (
              <span className={styles.badge}>{item.badge}</span>
            )}
            {hasChildren && (
              <span
                className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
                aria-hidden="true"
              >
                &#9662;
              </span>
            )}
          </>
        )}
      </button>

      {/* Submenu */}
      {hasChildren && expanded && !collapsed && (
        <ul className={styles.subList}>
          {item.children!.map((child) => (
            <SidebarNavItem
              key={child.id}
              item={child}
              collapsed={collapsed}
              activePath={activePath}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
