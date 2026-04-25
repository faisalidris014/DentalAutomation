'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, AlertTriangle, XCircle, AlertCircle, Info, CheckCircle2, Check, X, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { NavPill } from '@/components/ui/NavPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRole } from '@/context/RoleContext';
import { api } from '@/lib/api';
import { mapApiNotificationToNotification } from '@/lib/adapters';
import { formatRelativeTime } from '@/lib/formatters';
import type { Notification } from '@/types';
import type { PaginatedResponse, ApiNotification } from '@/types/api';

const categoryConfig: Record<string, { icon: typeof Bell; color: string; variant: 'red' | 'amber' | 'cyan' | 'green' | 'purple' }> = {
  failure: { icon: XCircle, color: 'var(--red)', variant: 'red' },
  denial: { icon: AlertTriangle, color: 'var(--amber)', variant: 'amber' },
  action_required: { icon: AlertCircle, color: 'var(--purple)', variant: 'purple' },
  info: { icon: Info, color: 'var(--accent)', variant: 'cyan' },
  success: { icon: CheckCircle2, color: 'var(--green)', variant: 'green' },
};

const filters = ['All', 'Unread', 'Failures', 'Denials', 'Action Required', 'Info', 'Success'];

// Map filter labels to API query params
const filterToParams: Record<string, string> = {
  Unread: 'is_read=false',
  Failures: 'severity=error',
  Denials: 'severity=warning',
  'Action Required': 'type=action_required',
  Info: 'severity=info',
  Success: 'severity=success',
};

export default function NotificationsPage() {
  const router = useRouter();
  const { role } = useRole();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const fetchNotifications = useCallback(async (activeFilter: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      const extra = filterToParams[activeFilter];
      if (extra) {
        extra.split('&').forEach(p => {
          const [k, v] = p.split('=');
          params.set(k, v);
        });
      }
      const res = await api.get<PaginatedResponse<ApiNotification>>(`/api/notifications?${params}`);
      setNotifications(res.data.map(mapApiNotificationToNotification));
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(filter);
  }, [filter, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read && !n.dismissed).length;

  const filtered = notifications.filter(n => !n.dismissed);

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    api.put(`/api/notifications/${id}`, { isRead: true }).catch(() => {});
  };

  const dismiss = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n));
    api.put(`/api/notifications/${id}`, { isDismissed: true }).catch(() => {});
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    api.put('/api/notifications/mark-all-read').catch(() => {});
  };

  return (
    <div className="notif-page">
      <div className="notif-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn-ghost" onClick={markAllRead}>
            <Check size={14} /> Mark all as read
          </button>
        )}
      </div>

      <div className="notif-filters">
        {filters.map(f => (
          <NavPill key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </NavPill>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', color: 'var(--text-tertiary)' }}>
          <Loader2 size={24} className="spin-icon" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Bell size={48} />} title="No notifications" description="Nothing to show for this filter." />
      ) : (
        <div className="notif-list">
          {filtered.map((notif, i) => {
            const cfg = categoryConfig[notif.category];
            const Icon = cfg.icon;
            return (
              <div
                key={notif.id}
                className={`notif-item ${!notif.read ? 'notif-item--unread' : ''}`}
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => {
                  markRead(notif.id);
                  if (notif.linkTo) router.push(notif.linkTo);
                }}
              >
                <div className="notif-icon" style={{ color: cfg.color, background: `${cfg.color}15` }}>
                  <Icon size={18} />
                </div>
                <div className="notif-content">
                  <div className="notif-title-row">
                    <span className="notif-title">{notif.title}</span>
                    <Badge variant={cfg.variant} size="sm">{notif.category.replace('_', ' ')}</Badge>
                  </div>
                  <p className="notif-message">{notif.message}</p>
                  <span className="notif-time mono">{formatRelativeTime(notif.timestamp)}</span>
                </div>
                <button className="notif-dismiss" onClick={e => { e.stopPropagation(); dismiss(notif.id); }} title="Dismiss">
                  <X size={14} />
                </button>
                {!notif.read && <div className="notif-unread-dot" />}
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .notif-page {
          max-width: 800px;
          animation: fadeIn var(--transition-base) ease;
        }
        .page-title {
          font-size: var(--text-2xl);
          font-weight: 600;
          color: var(--text-primary);
        }
        .page-subtitle {
          font-size: var(--text-sm);
          color: var(--text-tertiary);
          margin-top: 2px;
        }
        .notif-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-lg);
        }
        .btn-ghost {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .btn-ghost:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: var(--border-hover);
        }
        .notif-filters {
          display: flex;
          gap: 2px;
          margin-bottom: var(--space-md);
          overflow-x: auto;
        }
        .notif-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .notif-item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-md);
          padding: var(--space-md) var(--space-lg);
          background: var(--bg-glass);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          position: relative;
          animation: fadeIn var(--transition-base) ease both;
        }
        .notif-item:hover {
          background: var(--bg-glass-hover);
          border-color: var(--border-hover);
        }
        .notif-item--unread {
          border-left: 3px solid var(--accent);
          background: rgba(34, 211, 238, 0.03);
        }
        .notif-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          flex-shrink: 0;
        }
        .notif-content {
          flex: 1;
          min-width: 0;
        }
        .notif-title-row {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: 2px;
        }
        .notif-title {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
        }
        .notif-message {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 4px;
        }
        .notif-time {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .notif-dismiss {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          flex-shrink: 0;
          opacity: 0;
          transition: all var(--transition-fast);
        }
        .notif-item:hover .notif-dismiss {
          opacity: 1;
        }
        .notif-dismiss:hover {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-secondary);
        }
        .notif-unread-dot {
          position: absolute;
          top: var(--space-md);
          right: var(--space-md);
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent);
        }
      `}</style>
    </div>
  );
}
