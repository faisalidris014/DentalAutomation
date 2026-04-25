'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, CheckCircle2, XCircle, Clock, Loader2, Filter, Activity } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KPICard } from '@/components/ui/KPICard';
import { NavPill } from '@/components/ui/NavPill';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDuration, formatRelativeTime, statusColor } from '@/lib/formatters';
import { useRole } from '@/context/RoleContext';
import { api } from '@/lib/api';
import { mapApiJobToJob } from '@/lib/adapters';
import type { Job } from '@/types';
import type { PaginatedResponse, ApiJob } from '@/types/api';

type JobType = 'eligibility' | 'eob_retrieval' | 'claim_submit' | 'claim_status' | 'recall_reminder' | 'patient_sync';
type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

const jobTypeLabels: Record<JobType, string> = {
  eligibility: 'Eligibility Check',
  eob_retrieval: 'EOB Retrieval',
  claim_submit: 'Claim Submission',
  claim_status: 'Claim Status',
  recall_reminder: 'Recall Reminder',
  patient_sync: 'Patient Sync',
};

const statusFilters = ['All', 'Running', 'Completed', 'Failed', 'Queued'];

const statusIcons: Record<JobStatus, typeof CheckCircle2> = {
  completed: CheckCircle2,
  running: Loader2,
  failed: XCircle,
  queued: Clock,
  cancelled: XCircle,
};

export default function AutomationsPage() {
  const { role } = useRole();
  const [filter, setFilter] = useState('All');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchJobs = () => {
    setLoading(true);
    setError(null);
    api.get<PaginatedResponse<ApiJob>>('/api/jobs?limit=50')
      .then(res => setJobs(res.data.map(mapApiJobToJob)))
      .catch(() => setError('Failed to load jobs. Check your connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchJobs(); }, []);

  if (role === 'staff_user') {
    return (
      <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <Zap size={48} style={{ opacity: 0.3, marginBottom: 'var(--space-md)' }} />
        <h2 style={{ color: 'var(--text-secondary)' }}>Access Restricted</h2>
        <p>Automation monitoring is available for Administrators only.</p>
      </div>
    );
  }

  const filtered = filter === 'All'
    ? jobs
    : jobs.filter(j => j.status === filter.toLowerCase());

  const total = jobs.length;
  const completed = jobs.filter(j => j.status === 'completed').length;
  const running = jobs.filter(j => j.status === 'running').length;
  const failed = jobs.filter(j => j.status === 'failed').length;
  const avgDuration = jobs.filter(j => j.duration).reduce((s, j) => s + (j.duration || 0), 0) / (completed + failed || 1);

  return (
    <div className="automations-page">
      <h1 className="page-title">Automation Jobs</h1>
      <p className="page-subtitle">Monitor browser automation tasks across all workflows</p>

      {error && (
        <div className="error-banner">
          <XCircle size={16} />
          <span>{error}</span>
          <button className="retry-btn" onClick={fetchJobs}>Retry</button>
        </div>
      )}

      <div className="kpi-grid">
        <KPICard label="Total Jobs Today" value={total} icon={<Zap size={18} />} accentColor="var(--accent)" />
        <KPICard label="Success Rate" value={`${((completed / (completed + failed || 1)) * 100).toFixed(1)}%`} icon={<CheckCircle2 size={18} />} accentColor="var(--green)" delta="+2.1% vs yesterday" deltaType="positive" />
        <KPICard label="Currently Running" value={running} icon={<Activity size={18} />} accentColor="var(--amber)" />
        <KPICard label="Avg Duration" value={formatDuration(avgDuration)} icon={<Clock size={18} />} accentColor="var(--purple)" />
      </div>

      <div className="filter-bar">
        <Filter size={14} style={{ color: 'var(--text-tertiary)' }} />
        {statusFilters.map(f => (
          <NavPill key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
            {f !== 'All' && (
              <span className="filter-count">
                {jobs.filter(j => j.status === f.toLowerCase()).length}
              </span>
            )}
          </NavPill>
        ))}
      </div>

      <Card padding="0">
        <table className="jobs-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Type</th>
              <th>Patient / Target</th>
              <th>Payer</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Triggered By</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((job, i) => {
              const StatusIcon = statusIcons[job.status];
              const variant = statusColor(job.status) as 'green' | 'amber' | 'red' | 'cyan';
              return (
                <tr key={job.id} className="job-row" onClick={() => router.push(`/automations/${job.id}`)} style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="mono" style={{ color: 'var(--accent-text)' }}>{job.id}</td>
                  <td>{jobTypeLabels[job.type]}</td>
                  <td>{job.patientName || '—'}</td>
                  <td>{job.payerName || '—'}</td>
                  <td>
                    <div className="status-cell">
                      <Badge variant={variant} dot>{job.status.replace('_', ' ')}</Badge>
                      {job.status === 'running' && job.progress !== undefined && (
                        <div style={{ width: 80 }}>
                          <ProgressBar value={job.progress} animated color="var(--accent)" height={4} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="mono">{job.duration ? formatDuration(job.duration) : job.status === 'running' ? '...' : '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{job.triggeredBy}</td>
                  <td className="mono" style={{ color: 'var(--text-tertiary)' }}>{formatRelativeTime(job.startedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <style jsx>{`
        .automations-page {
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
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }
        .filter-bar {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-md);
        }
        .filter-count {
          font-size: 10px;
          color: var(--text-muted);
          margin-left: 2px;
        }
        .jobs-table {
          width: 100%;
          border-collapse: collapse;
        }
        .jobs-table th {
          text-align: left;
          padding: var(--space-md);
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--border);
        }
        .jobs-table td {
          padding: var(--space-md);
          font-size: var(--text-sm);
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }
        .job-row {
          cursor: pointer;
          transition: background var(--transition-fast);
          animation: fadeIn var(--transition-base) ease both;
        }
        .job-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .job-row:last-child td {
          border-bottom: none;
        }
        .status-cell {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        @media (max-width: 1024px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
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
