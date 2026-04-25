'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { TopNav } from '@/components/layout/TopNav';
import { Sidebar } from '@/components/layout/Sidebar';
import type { PaginatedResponse, ApiNotification } from '@/types/api';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    api.get<PaginatedResponse<ApiNotification>>('/api/notifications?is_read=false&limit=1')
      .then(res => setUnreadCount(res.total))
      .catch(() => setUnreadCount(0));
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="loading-gate">
        <div className="loading-spinner" />
        <style jsx>{`
          .loading-gate {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: var(--bg-deepest);
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border);
            border-top-color: var(--accent);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
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
          min-width: 0;
        }
        @media (max-width: 768px) {
          .app-main {
            padding: var(--space-md);
          }
        }
        @media (max-width: 480px) {
          .app-main {
            padding: var(--space-sm) var(--space-md);
          }
        }
      `}</style>
    </>
  );
}
