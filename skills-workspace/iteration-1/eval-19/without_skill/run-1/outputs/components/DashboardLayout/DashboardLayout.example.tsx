import React from 'react';
import { DashboardLayout } from './DashboardLayout';
import type { SidebarItem, UserInfo } from './DashboardLayout';

/**
 * Example usage of the DashboardLayout component.
 */

const sidebarItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: <span>&#9632;</span>,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: <span>&#9650;</span>,
    badge: 'New',
  },
  {
    id: 'users',
    label: 'Users',
    path: '/users',
    icon: <span>&#9679;</span>,
    badge: 12,
    children: [
      { id: 'users-list', label: 'All Users', path: '/users/list' },
      { id: 'users-roles', label: 'Roles', path: '/users/roles' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: <span>&#9881;</span>,
  },
];

const currentUser: UserInfo = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  avatarUrl: undefined,
  role: 'Admin',
};

export const DashboardPage: React.FC = () => {
  const handleNavigate = (path: string) => {
    console.log('Navigate to:', path);
  };

  const handleLogout = () => {
    console.log('User logged out');
  };

  return (
    <DashboardLayout
      title="Overview"
      sidebarItems={sidebarItems}
      user={currentUser}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      <div style={{ display: 'grid', gap: '24px' }}>
        {/* Stat cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          {['Total Users', 'Revenue', 'Orders', 'Conversion'].map((label) => (
            <div
              key={label}
              style={{
                padding: '24px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                {label}
              </p>
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                {Math.floor(Math.random() * 10000).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Content placeholder */}
        <div
          style={{
            padding: '48px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            textAlign: 'center',
            color: '#9ca3af',
          }}
        >
          Main content area - charts, tables, or any other dashboard widgets go here.
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
