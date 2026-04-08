'use client';

import {
  Building2,
  BriefcaseBusiness,
  TrendingUp,
  Bot,
  AlertTriangle,
  ServerCrash,
  FileWarning,
  Clock,
  ShieldAlert,
  XCircle,
  Plus,
  ArrowUpCircle,
} from 'lucide-react';
import { KPICard } from '@/components/ui/KPICard';
import { Card } from '@/components/ui/Card';
import { StatusDot } from '@/components/ui/StatusDot';
import { Badge } from '@/components/ui/Badge';
import { formatRelativeTime } from '@/lib/formatters';

const clinics = [
  {
    name: 'Bright Smiles Dental',
    agentStatus: 'online' as const,
    lastHeartbeat: new Date(Date.now() - 30000).toISOString(),
    jobsInQueue: 4,
    jobsCompleted: 28,
  },
  {
    name: 'North Star Dental',
    agentStatus: 'offline' as const,
    lastHeartbeat: new Date(Date.now() - 3600000 * 2).toISOString(),
    jobsInQueue: 12,
    jobsCompleted: 18,
  },
  {
    name: 'Summit Oral Surgery',
    agentStatus: 'online' as const,
    lastHeartbeat: new Date(Date.now() - 15000).toISOString(),
    jobsInQueue: 2,
    jobsCompleted: 27,
  },
];

const alerts = [
  {
    id: 1,
    icon: <ServerCrash size={16} />,
    message: 'Agent offline: North Star Dental',
    time: new Date(Date.now() - 3600000 * 2).toISOString(),
    severity: 'red' as const,
  },
  {
    id: 2,
    icon: <FileWarning size={16} />,
    message: 'Failed job: EOB retrieval timeout',
    time: new Date(Date.now() - 3600000).toISOString(),
    severity: 'red' as const,
  },
  {
    id: 3,
    icon: <ShieldAlert size={16} />,
    message: 'SSL certificate expires in 14 days',
    time: new Date(Date.now() - 3600000 * 4).toISOString(),
    severity: 'amber' as const,
  },
  {
    id: 4,
    icon: <XCircle size={16} />,
    message: 'Claim submission rejected: invalid NPI',
    time: new Date(Date.now() - 3600000 * 5).toISOString(),
    severity: 'amber' as const,
  },
  {
    id: 5,
    icon: <AlertTriangle size={16} />,
    message: 'High queue depth at Bright Smiles Dental',
    time: new Date(Date.now() - 3600000 * 6).toISOString(),
    severity: 'amber' as const,
  },
];

const statusVariantMap: Record<string, 'green' | 'red' | 'amber'> = {
  online: 'green',
  offline: 'red',
  degraded: 'amber',
};

export function ITAdminDashboard() {
  return (
    <div className="it-admin-dashboard">
      <div className="section-title">System Overview</div>

      <div className="kpi-grid">
        <div style={{ animationDelay: '0ms' }} className="kpi-animate">
          <KPICard
            label="Total Clinics"
            value={3}
            icon={<Building2 size={20} />}
            accentColor="var(--accent)"
          />
        </div>
        <div style={{ animationDelay: '60ms' }} className="kpi-animate">
          <KPICard
            label="Jobs Today"
            value={73}
            icon={<BriefcaseBusiness size={20} />}
            accentColor="var(--purple)"
          />
        </div>
        <div style={{ animationDelay: '120ms' }} className="kpi-animate">
          <KPICard
            label="Success Rate"
            value="97.2%"
            icon={<TrendingUp size={20} />}
            accentColor="var(--green)"
            delta="+0.5% vs yesterday"
            deltaType="positive"
          />
        </div>
        <div style={{ animationDelay: '180ms' }} className="kpi-animate">
          <KPICard
            label="Active Agents"
            value="2 / 3"
            icon={<Bot size={20} />}
            accentColor="var(--amber)"
          />
        </div>
      </div>

      <div className="section-title">Clinic Health</div>

      <div className="clinic-grid">
        {clinics.map((clinic, i) => (
          <div
            key={clinic.name}
            className="kpi-animate"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Card hoverable>
              <div className="clinic-card__header">
                <span className="clinic-card__name">{clinic.name}</span>
                <StatusDot
                  variant={statusVariantMap[clinic.agentStatus]}
                  label={clinic.agentStatus}
                />
              </div>
              <div className="clinic-card__meta">
                <div className="clinic-card__row">
                  <Clock size={14} />
                  <span>Last heartbeat: {formatRelativeTime(clinic.lastHeartbeat)}</span>
                </div>
                <div className="clinic-card__stats">
                  <Badge variant="cyan">{clinic.jobsInQueue} queued</Badge>
                  <Badge variant="green">{clinic.jobsCompleted} completed</Badge>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>

      <div className="bottom-grid">
        <div>
          <div className="section-title">Recent System Alerts</div>
          <Card>
            <div className="alerts-list">
              {alerts.map((alert) => (
                <div key={alert.id} className="alert-item">
                  <div className="alert-item__icon" data-severity={alert.severity}>
                    {alert.icon}
                  </div>
                  <div className="alert-item__content">
                    <span className="alert-item__message">{alert.message}</span>
                    <span className="alert-item__time">{formatRelativeTime(alert.time)}</span>
                  </div>
                  <Badge variant={alert.severity} size="sm">
                    {alert.severity === 'red' ? 'Critical' : 'Warning'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <div className="section-title">Quick Actions</div>
          <div className="actions-grid">
            <button className="action-btn">
              <Plus size={18} />
              <span>Add Clinic</span>
            </button>
            <button className="action-btn action-btn--secondary">
              <ArrowUpCircle size={18} />
              <span>Push Agent Update</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .it-admin-dashboard {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }
        .section-title {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-lg);
        }
        .kpi-animate {
          opacity: 0;
          animation: fadeSlideUp 0.4s ease forwards;
        }
        .clinic-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-lg);
        }
        .clinic-card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-md);
        }
        .clinic-card__name {
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--text-primary);
        }
        .clinic-card__meta {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        .clinic-card__row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .clinic-card__stats {
          display: flex;
          gap: var(--space-sm);
          margin-top: var(--space-xs);
        }
        .bottom-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--space-lg);
          align-items: start;
        }
        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .alert-item {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }
        .alert-item__icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .alert-item__icon[data-severity='red'] {
          background: rgba(248, 113, 113, 0.12);
          color: var(--red);
        }
        .alert-item__icon[data-severity='amber'] {
          background: rgba(251, 191, 36, 0.12);
          color: var(--amber);
        }
        .alert-item__content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .alert-item__message {
          font-size: var(--text-sm);
          color: var(--text-primary);
          font-weight: 500;
        }
        .alert-item__time {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .actions-grid {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
          padding: var(--space-md) var(--space-lg);
          border-radius: var(--radius-lg);
          font-size: var(--text-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
          background: var(--accent);
          color: var(--bg-deepest);
        }
        .action-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(34, 211, 238, 0.25);
        }
        .action-btn--secondary {
          background: var(--bg-glass);
          color: var(--text-primary);
          border: 1px solid var(--border);
          backdrop-filter: blur(12px);
        }
        .action-btn--secondary:hover {
          background: var(--bg-glass-hover);
          border-color: var(--border-hover);
          box-shadow: var(--shadow-md);
        }
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 1024px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .clinic-grid {
            grid-template-columns: 1fr;
          }
          .bottom-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
