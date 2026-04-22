'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, AlertTriangle, XCircle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatRelativeTime } from '@/lib/formatters';
import { useRole } from '@/context/RoleContext';

interface AlertNotification {
  id: string;
  category: 'failure' | 'denial' | 'action_required' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  linkTo?: string;
}

const categoryConfig: Record<string, { icon: typeof Bell; color: string; variant: 'red' | 'amber' | 'cyan' | 'green' | 'purple' }> = {
  failure: { icon: XCircle, color: 'var(--red)', variant: 'red' },
  denial: { icon: AlertTriangle, color: 'var(--amber)', variant: 'amber' },
  action_required: { icon: AlertCircle, color: 'var(--purple)', variant: 'purple' },
  info: { icon: Info, color: 'var(--accent)', variant: 'cyan' },
  success: { icon: CheckCircle2, color: 'var(--green)', variant: 'green' },
};

const recentAlerts: AlertNotification[] = [
  { id: 'a1', category: 'failure', title: 'EOB Retrieval Failed', message: 'Cigna portal timeout — unable to retrieve EOBs.', timestamp: '2026-04-07T14:30:00Z', linkTo: '/automations' },
  { id: 'a2', category: 'denial', title: 'Claim Denied — CLM-5521', message: 'Delta Dental denied claim for James Wilson.', timestamp: '2026-04-07T14:15:00Z', linkTo: '/claims' },
  { id: 'a3', category: 'action_required', title: 'Insurance Verification Needed', message: '8 patients scheduled this week have unverified insurance.', timestamp: '2026-04-07T13:45:00Z', linkTo: '/eligibility' },
];

interface AlertsDropdownProps {
  unreadCount: number;
  isActive: boolean;
  onNavigate: () => void;
}

export function AlertsDropdown({ unreadCount, isActive, onNavigate }: AlertsDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { role } = useRole();

  const filteredAlerts = recentAlerts.filter(alert => {
    if (role === 'staff_user' && alert.linkTo === '/automations') return false;
    return true;
  });

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="alerts-wrap" ref={ref}>
      <div className="alerts-btn-group">
        <button
          className={`alerts-main-btn ${isActive ? 'alerts-main-btn--active' : ''}`}
          onClick={onNavigate}
        >
          <Bell size={15} />
          <span>Alerts</span>
          {unreadCount > 0 && <span className="alerts-badge">{unreadCount}</span>}
        </button>
        <button
          className={`alerts-chevron ${open ? 'alerts-chevron--open' : ''}`}
          onClick={() => setOpen(!open)}
        >
          <ChevronDown size={13} />
        </button>
      </div>

      {open && (
        <div className="alerts-dropdown">
          <div className="alerts-dropdown__header">
            <span>Recent Alerts</span>
            <span className="alerts-dropdown__count">{unreadCount} unread</span>
          </div>
          <div className="alerts-dropdown__list">
            {filteredAlerts.map(alert => {
              const cfg = categoryConfig[alert.category];
              const Icon = cfg.icon;
              return (
                <button
                  key={alert.id}
                  className="alerts-dropdown__item"
                  onClick={() => {
                    setOpen(false);
                    if (alert.linkTo) router.push(alert.linkTo);
                  }}
                >
                  <div className="alerts-dropdown__icon" style={{ color: cfg.color, background: `${cfg.color}15` }}>
                    <Icon size={14} />
                  </div>
                  <div className="alerts-dropdown__content">
                    <span className="alerts-dropdown__title">{alert.title}</span>
                    <span className="alerts-dropdown__time">{formatRelativeTime(alert.timestamp)}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            className="alerts-dropdown__footer"
            onClick={() => { setOpen(false); onNavigate(); }}
          >
            View All Notifications
          </button>
        </div>
      )}

      <style jsx>{`
        .alerts-wrap {
          position: relative;
        }
        .alerts-btn-group {
          display: flex;
          align-items: center;
          border-radius: var(--radius-full);
          overflow: hidden;
          border: 1px solid transparent;
          transition: all var(--transition-fast);
        }
        .alerts-btn-group:hover {
          border-color: var(--border);
        }
        .alerts-main-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px 6px 12px;
          font-size: var(--text-xs);
          font-weight: 500;
          color: var(--text-secondary);
          border-radius: var(--radius-full) 0 0 var(--radius-full);
          transition: all var(--transition-fast);
        }
        .alerts-main-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }
        .alerts-main-btn--active {
          background: rgba(34, 211, 238, 0.1);
          color: var(--accent-text);
        }
        .alerts-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: var(--radius-full);
          background: var(--red);
          color: white;
          font-size: 10px;
          font-weight: 700;
        }
        .alerts-chevron {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px 8px;
          color: var(--text-muted);
          border-left: 1px solid var(--border);
          transition: all var(--transition-fast);
        }
        .alerts-chevron:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }
        .alerts-chevron--open {
          color: var(--accent-text);
        }
        .alerts-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 340px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-hover);
          border-radius: var(--radius-lg);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(16px);
          z-index: 1000;
          animation: fadeIn 150ms ease;
          overflow: hidden;
        }
        .alerts-dropdown__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
        }
        .alerts-dropdown__count {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          font-weight: 400;
        }
        .alerts-dropdown__list {
          max-height: 240px;
          overflow-y: auto;
        }
        .alerts-dropdown__item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          width: 100%;
          padding: 12px 16px;
          text-align: left;
          transition: background var(--transition-fast);
        }
        .alerts-dropdown__item:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .alerts-dropdown__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          flex-shrink: 0;
        }
        .alerts-dropdown__content {
          flex: 1;
          min-width: 0;
        }
        .alerts-dropdown__title {
          display: block;
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .alerts-dropdown__time {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .alerts-dropdown__footer {
          display: block;
          width: 100%;
          padding: 10px 16px;
          text-align: center;
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--accent-text);
          border-top: 1px solid var(--border);
          transition: background var(--transition-fast);
        }
        .alerts-dropdown__footer:hover {
          background: rgba(34, 211, 238, 0.05);
        }
      `}</style>
    </div>
  );
}
