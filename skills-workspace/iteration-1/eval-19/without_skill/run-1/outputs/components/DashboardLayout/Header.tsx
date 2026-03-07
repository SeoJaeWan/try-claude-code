import React, { useState, useRef, useEffect } from 'react';
import type { UserInfo } from './DashboardLayout';
import styles from './Header.module.css';

export interface HeaderProps {
  title: string;
  user?: UserInfo;
  onToggleSidebar: () => void;
  onToggleMobileSidebar: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  user,
  onToggleSidebar,
  onToggleMobileSidebar,
  onLogout,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  return (
    <header className={styles.header} role="banner">
      {/* Left section */}
      <div className={styles.left}>
        {/* Desktop toggle */}
        <button
          className={`${styles.toggleBtn} ${styles.desktopOnly}`}
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <HamburgerIcon />
        </button>

        {/* Mobile toggle */}
        <button
          className={`${styles.toggleBtn} ${styles.mobileOnly}`}
          onClick={onToggleMobileSidebar}
          aria-label="Open navigation menu"
        >
          <HamburgerIcon />
        </button>

        <h1 className={styles.title}>{title}</h1>
      </div>

      {/* Right section */}
      <div className={styles.right}>
        {/* Notifications */}
        <button className={styles.iconBtn} aria-label="Notifications">
          <BellIcon />
        </button>

        {/* User menu */}
        {user && (
          <div className={styles.userMenu} ref={menuRef}>
            <button
              className={styles.userBtn}
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className={styles.avatar}
                />
              ) : (
                <span className={styles.avatarPlaceholder}>
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className={styles.userName}>{user.name}</span>
            </button>

            {userMenuOpen && (
              <div className={styles.dropdown} role="menu">
                <div className={styles.dropdownHeader}>
                  <strong>{user.name}</strong>
                  {user.email && <span className={styles.email}>{user.email}</span>}
                  {user.role && <span className={styles.role}>{user.role}</span>}
                </div>
                <div className={styles.dropdownDivider} />
                <button
                  className={styles.dropdownItem}
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Profile Settings
                </button>
                <button
                  className={styles.dropdownItem}
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Preferences
                </button>
                {onLogout && (
                  <>
                    <div className={styles.dropdownDivider} />
                    <button
                      className={`${styles.dropdownItem} ${styles.logoutItem}`}
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                    >
                      Log out
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

const HamburgerIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const BellIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M10 2C7.24 2 5 4.24 5 7V10.5L3.5 13H16.5L15 10.5V7C15 4.24 12.76 2 10 2ZM10 18C11.1 18 12 17.1 12 16H8C8 17.1 8.9 18 10 18Z"
      fill="currentColor"
    />
  </svg>
);
