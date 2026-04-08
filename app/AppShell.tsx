'use client';

import { useState, useEffect } from 'react';
import { RoleProvider } from '@/context/RoleContext';
import { TopNav } from '@/components/layout/TopNav';
import { Sidebar } from '@/components/layout/Sidebar';
import type { Notification } from '@/types';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    import('@/data/mock/notifications.json')
      .then(mod => {
        const notifs = mod.default as Notification[];
        setUnreadCount(notifs.filter(n => !n.read && !n.dismissed).length);
      })
      .catch(() => setUnreadCount(3));
  }, []);

  return (
    <RoleProvider>
      <TopNav unreadCount={unreadCount} />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          {children}
        </main>
      </div>

      <style jsx>{`
        .app-body {
          display: flex;
          flex: 1;
          min-height: calc(100vh - var(--nav-height));
        }
        .app-main {
          flex: 1;
          padding: var(--space-lg);
          overflow-y: auto;
          background: var(--bg-deepest);
        }
      `}</style>
    </RoleProvider>
  );
}
