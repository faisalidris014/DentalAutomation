'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, AlertTriangle, XCircle, AlertCircle, Info, CheckCircle2, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { NavPill } from '@/components/ui/NavPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRole } from '@/context/RoleContext';
import { formatRelativeTime } from '@/lib/formatters';

interface MockNotification {
  id: string;
  category: 'failure' | 'denial' | 'action_required' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  dismissed: boolean;
  linkTo?: string;
}

const categoryConfig: Record<string, { icon: typeof Bell; color: string; variant: 'red' | 'amber' | 'cyan' | 'green' | 'purple' }> = {
  failure: { icon: XCircle, color: 'var(--red)', variant: 'red' },
  denial: { icon: AlertTriangle, color: 'var(--amber)', variant: 'amber' },
  action_required: { icon: AlertCircle, color: 'var(--purple)', variant: 'purple' },
  info: { icon: Info, color: 'var(--accent)', variant: 'cyan' },
  success: { icon: CheckCircle2, color: 'var(--green)', variant: 'green' },
};

const initialNotifications: MockNotification[] = [
  { id: 'n1', category: 'failure', title: 'EOB Retrieval Failed', message: 'Cigna portal timeout — unable to retrieve EOBs. Connection refused after 30s.', timestamp: '2026-04-07T14:30:00Z', read: false, dismissed: false, linkTo: '/automations' },
  { id: 'n2', category: 'denial', title: 'Claim Denied — CLM-5521', message: 'Delta Dental denied claim for James Wilson. Reason: Frequency limitation exceeded.', timestamp: '2026-04-07T14:15:00Z', read: false, dismissed: false, linkTo: '/claims' },
  { id: 'n3', category: 'action_required', title: 'Insurance Verification Needed', message: '8 patients scheduled this week have unverified insurance coverage.', timestamp: '2026-04-07T13:45:00Z', read: false, dismissed: false, linkTo: '/eligibility' },
  { id: 'n4', category: 'failure', title: 'Agent Offline — North Star', message: 'North Star Dental Group agent has been offline for 4 hours. Last heartbeat at 10:15 AM.', timestamp: '2026-04-07T10:15:00Z', read: false, dismissed: false, linkTo: '/agents' },
  { id: 'n5', category: 'success', title: 'Batch Recalls Sent', message: '12 recall reminders successfully sent via email and SMS.', timestamp: '2026-04-07T13:00:00Z', read: true, dismissed: false },
  { id: 'n6', category: 'denial', title: 'Claim Denied — CLM-5498', message: 'MetLife denied claim for Robert Kim. Reason: Prior authorization required for SRP.', timestamp: '2026-04-07T12:30:00Z', read: true, dismissed: false, linkTo: '/claims' },
  { id: 'n7', category: 'info', title: 'Agent Update Available', message: 'DentalFlow Agent v2.4.1 is available. Lakewood Family Dentistry is running v2.3.8.', timestamp: '2026-04-07T10:00:00Z', read: true, dismissed: false, linkTo: '/agents' },
  { id: 'n8', category: 'success', title: 'Patient Sync Complete', message: '142 patient records synchronized from OpenDental across all clinics.', timestamp: '2026-04-07T09:00:00Z', read: true, dismissed: false },
  { id: 'n9', category: 'action_required', title: 'Overdue Recalls Alert', message: '23 patients are overdue for recall appointments. 8 are 60+ days overdue.', timestamp: '2026-04-07T08:00:00Z', read: true, dismissed: false, linkTo: '/recalls' },
  { id: 'n10', category: 'failure', title: 'Credential Error — MetLife', message: 'MetLife portal login failed. Service account credentials may need updating.', timestamp: '2026-04-06T17:30:00Z', read: true, dismissed: false, linkTo: '/settings' },
  { id: 'n11', category: 'info', title: 'Daily Summary', message: 'Yesterday: 47 jobs completed, 2 failures, 3 claims approved, $12,450 collected.', timestamp: '2026-04-07T07:00:00Z', read: true, dismissed: false },
  { id: 'n12', category: 'success', title: 'Claim Approved — CLM-5490', message: 'Delta Dental approved claim for Linda Patel. Payment: $148.00.', timestamp: '2026-04-06T16:00:00Z', read: true, dismissed: false, linkTo: '/claims' },
];

const filters = ['All', 'Unread', 'Failures', 'Denials', 'Action Required', 'Info', 'Success'];

export default function NotificationsPage() {
  const router = useRouter();
  const { role } = useRole();
  const [notifications, setNotifications] = useState(() =>
    initialNotifications.filter(n => {
      if (role === 'staff_user') {
        if (n.linkTo === '/agents' || n.linkTo === '/settings' || n.linkTo === '/automations') return false;
      }
      return true;
    })
  );
  const [filter, setFilter] = useState('All');

  const unreadCount = notifications.filter(n => !n.read && !n.dismissed).length;

  const filtered = notifications
    .filter(n => !n.dismissed)
    .filter(n => {
      if (filter === 'All') return true;
      if (filter === 'Unread') return !n.read;
      return n.category === filter.toLowerCase().replace(' ', '_');
    });

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const dismiss = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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

      {filtered.length === 0 ? (
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
