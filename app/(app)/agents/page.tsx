'use client';

import { useState, useEffect } from 'react';
import { HardDrive, Upload, FileText, Wifi, WifiOff, Database, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { KPICard } from '@/components/ui/KPICard';
import { Timeline } from '@/components/ui/Timeline';
import { useRole } from '@/context/RoleContext';
import { api } from '@/lib/api';
import { mapApiAgentToAgent } from '@/lib/adapters';
import { formatRelativeTime } from '@/lib/formatters';
import type { AgentStatus } from '@/types';
import type { SingleResponse, ApiAgent } from '@/types/api';

type AgentData = AgentStatus;

export default function AgentsPage() {
  const { role } = useRole();
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  useEffect(() => {
    setError(null);
    api.get<{ data: ApiAgent[] }>('/api/agents')
      .then(res => setAgents(res.data.map(mapApiAgentToAgent)))
      .catch(() => setError('Failed to load agents. Check your connection and try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (role !== 'it_admin') {
    return (
      <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <HardDrive size={48} style={{ opacity: 0.3, marginBottom: 'var(--space-md)' }} />
        <h2 style={{ color: 'var(--text-secondary)' }}>Access Restricted</h2>
        <p>Agent monitoring is only available for IT Administrators.</p>
      </div>
    );
  }

  const onlineCount = agents.filter(a => a.status === 'online').length;
  const totalJobs = agents.reduce((s, a) => s + a.jobsCompletedToday, 0);

  return (
    <div className="agents-page">
      <h1 className="page-title">Local Agent Monitor</h1>
      <p className="page-subtitle">Manage and monitor DentalFlow agents deployed at clinic locations</p>

      {error && (
        <div className="error-banner">
          <WifiOff size={16} />
          <span>{error}</span>
          <button className="retry-btn" onClick={() => { setLoading(true); setError(null); api.get<{ data: ApiAgent[] }>('/api/agents').then(res => setAgents(res.data.map(mapApiAgentToAgent))).catch(() => setError('Failed to load agents. Check your connection and try again.')).finally(() => setLoading(false)); }}>Retry</button>
        </div>
      )}

      <div className="kpi-grid">
        <KPICard label="Agents Online" value={`${onlineCount}/${agents.length}`} icon={<Wifi size={18} />} accentColor="var(--green)" />
        <KPICard label="Total Jobs Today" value={totalJobs} icon={<HardDrive size={18} />} accentColor="var(--accent)" />
        <KPICard label="Latest Version" value="v2.4.1" icon={<Upload size={18} />} accentColor="var(--purple)" mono />
      </div>

      <div className="agents-grid">
        {agents.map((agent, i) => {
          const isExpanded = expandedAgents.has(agent.id);
          const isOutdated = agent.version !== agent.latestVersion;
          const statusVariant = agent.status === 'online' ? 'green' : agent.status === 'updating' ? 'amber' : 'red';

          return (
            <Card key={agent.id} className={`agent-card stagger-${i + 1}`}>
              <div className="agent-header">
                <div className="agent-info">
                  <StatusDot variant={statusVariant} pulse={agent.status === 'online'} size={10} />
                  <div>
                    <h3 className="agent-name">{agent.clinicName}</h3>
                    <div className="agent-meta">
                      <span className="mono">v{agent.version}</span>
                      {isOutdated && <Badge variant="amber" size="sm">Update Available</Badge>}
                      {agent.status === 'offline' && <Badge variant="red" size="sm">Offline</Badge>}
                    </div>
                  </div>
                </div>
                <button className="expand-btn" onClick={() => setExpandedAgents(prev => {
                  const next = new Set(prev);
                  if (next.has(agent.id)) next.delete(agent.id);
                  else next.add(agent.id);
                  return next;
                })}>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              <div className="agent-stats">
                <div className="stat">
                  <span className="stat-label">Last Heartbeat</span>
                  <span className="stat-value mono">{formatRelativeTime(agent.lastHeartbeat)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Queue</span>
                  <span className="stat-value mono">{agent.jobsInQueue}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Completed Today</span>
                  <span className="stat-value mono">{agent.jobsCompletedToday}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">OpenDental</span>
                  <span className="stat-value">
                    {agent.openDentalConnected
                      ? <StatusDot variant="green" size={6} label="Connected" />
                      : <StatusDot variant="red" size={6} pulse={false} label="Disconnected" />
                    }
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Uptime</span>
                  <span className="stat-value mono">{agent.uptime}</span>
                </div>
              </div>

              <div className="agent-actions">
                {isOutdated && (
                  <button className="btn-accent-sm">
                    <Upload size={12} /> Push Update
                  </button>
                )}
                <button className="btn-ghost-sm" onClick={() => setExpandedAgents(prev => {
                  const next = new Set(prev);
                  if (next.has(agent.id)) next.delete(agent.id);
                  else next.add(agent.id);
                  return next;
                })}>
                  <FileText size={12} /> View Logs
                </button>
              </div>

              {isExpanded && (
                <div className="agent-logs">
                  <div className="logs-divider" />
                  <Timeline
                    items={agent.logs.map((log, li) => ({
                      id: `${agent.id}_log_${li}`,
                      timestamp: formatRelativeTime(log.timestamp),
                      title: log.message,
                      status: log.level === 'error' ? 'error' : log.level === 'warning' ? 'warning' : 'info',
                    }))}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <style jsx>{`
        .agents-page {
          max-width: 1200px;
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
          margin-bottom: var(--space-lg);
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }
        .agents-grid {
          display: grid;
          gap: var(--space-md);
        }
        .agent-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-md);
        }
        .agent-info {
          display: flex;
          align-items: flex-start;
          gap: var(--space-sm);
        }
        .agent-name {
          font-size: var(--text-md);
          font-weight: 600;
          color: var(--text-primary);
        }
        .agent-meta {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-top: 2px;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .expand-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          color: var(--text-tertiary);
          transition: all var(--transition-fast);
        }
        .expand-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-secondary);
        }
        .agent-stats {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-lg);
          margin-bottom: var(--space-md);
        }
        .stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .stat-label {
          font-size: var(--text-xs);
          color: var(--text-muted);
          font-weight: 500;
        }
        .stat-value {
          font-size: var(--text-sm);
          color: var(--text-primary);
        }
        .agent-actions {
          display: flex;
          gap: var(--space-sm);
        }
        .btn-accent-sm {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: var(--accent-dim);
          border: 1px solid rgba(34, 211, 238, 0.2);
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          font-weight: 500;
          color: var(--accent-text);
          transition: all var(--transition-fast);
        }
        .btn-accent-sm:hover {
          background: rgba(34, 211, 238, 0.2);
        }
        .btn-ghost-sm {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          font-weight: 500;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .btn-ghost-sm:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: var(--border-hover);
        }
        .agent-logs {
          margin-top: var(--space-md);
          animation: fadeIn var(--transition-base) ease;
        }
        .logs-divider {
          height: 1px;
          background: var(--border);
          margin-bottom: var(--space-md);
        }
        .error-banner {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-md) var(--space-lg);
          background: var(--red-dim);
          border: 1px solid rgba(248, 113, 113, 0.2);
          border-radius: var(--radius-md);
          color: var(--red);
          font-size: var(--text-sm);
          margin-bottom: var(--space-md);
        }
        .retry-btn {
          margin-left: auto;
          padding: 4px 12px;
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .retry-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: var(--border-hover);
        }
      `}</style>
    </div>
  );
}
