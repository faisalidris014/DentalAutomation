'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, CheckCircle2, XCircle, Clock, Loader2, Filter, Activity } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KPICard } from '@/components/ui/KPICard';
import { NavPill } from '@/components/ui/NavPill';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDuration, formatRelativeTime, statusColor } from '@/lib/formatters';

type JobType = 'eligibility' | 'eob_retrieval' | 'claim_submit' | 'claim_status' | 'recall_reminder' | 'patient_sync';
type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

interface MockJob {
  id: string;
  type: JobType;
  patientName?: string;
  payerName?: string;
  status: JobStatus;
  triggeredBy: string;
  startedAt: string;
  duration?: number;
  progress?: number;
  errorMessage?: string;
}

const jobTypeLabels: Record<JobType, string> = {
  eligibility: 'Eligibility Check',
  eob_retrieval: 'EOB Retrieval',
  claim_submit: 'Claim Submission',
  claim_status: 'Claim Status',
  recall_reminder: 'Recall Reminder',
  patient_sync: 'Patient Sync',
};

const mockJobs: MockJob[] = [
  { id: 'job_1', type: 'eligibility', patientName: 'Maria Santos', payerName: 'Delta Dental', status: 'running', triggeredBy: 'Jessica Torres', startedAt: '2026-04-07T14:32:00Z', progress: 65 },
  { id: 'job_2', type: 'claim_submit', patientName: 'James Wilson', payerName: 'Cigna', status: 'running', triggeredBy: 'Dr. Sarah Mitchell', startedAt: '2026-04-07T14:30:00Z', progress: 42 },
  { id: 'job_3', type: 'eob_retrieval', payerName: 'Delta Dental', status: 'running', triggeredBy: 'System Scheduler', startedAt: '2026-04-07T14:28:00Z', progress: 88 },
  { id: 'job_4', type: 'recall_reminder', patientName: 'Emily Chen', status: 'completed', triggeredBy: 'System Scheduler', startedAt: '2026-04-07T14:15:00Z', duration: 2340 },
  { id: 'job_5', type: 'eligibility', patientName: 'Robert Kim', payerName: 'MetLife', status: 'completed', triggeredBy: 'Jessica Torres', startedAt: '2026-04-07T14:10:00Z', duration: 4520 },
  { id: 'job_6', type: 'claim_status', patientName: 'Linda Patel', payerName: 'Delta Dental', status: 'completed', triggeredBy: 'System Scheduler', startedAt: '2026-04-07T13:55:00Z', duration: 3100 },
  { id: 'job_7', type: 'patient_sync', status: 'completed', triggeredBy: 'System Scheduler', startedAt: '2026-04-07T13:45:00Z', duration: 12400 },
  { id: 'job_8', type: 'eob_retrieval', payerName: 'Cigna', status: 'failed', triggeredBy: 'System Scheduler', startedAt: '2026-04-07T13:30:00Z', duration: 30200, errorMessage: 'Portal timeout after 30s — connection refused' },
  { id: 'job_9', type: 'eligibility', patientName: 'David Nguyen', payerName: 'Cigna', status: 'completed', triggeredBy: 'Dr. Sarah Mitchell', startedAt: '2026-04-07T13:20:00Z', duration: 5100 },
  { id: 'job_10', type: 'recall_reminder', patientName: 'Susan Thompson', status: 'completed', triggeredBy: 'System Scheduler', startedAt: '2026-04-07T13:15:00Z', duration: 1800 },
  { id: 'job_11', type: 'claim_submit', patientName: 'Michael Garcia', payerName: 'MetLife', status: 'failed', triggeredBy: 'Jessica Torres', startedAt: '2026-04-07T12:50:00Z', duration: 15600, errorMessage: 'Invalid credentials — MetLife portal login failed' },
  { id: 'job_12', type: 'eligibility', patientName: 'Angela Martinez', payerName: 'Delta Dental', status: 'completed', triggeredBy: 'Jessica Torres', startedAt: '2026-04-07T12:30:00Z', duration: 3800 },
  { id: 'job_13', type: 'recall_reminder', patientName: 'Thomas Brown', status: 'queued', triggeredBy: 'System Scheduler', startedAt: '2026-04-07T14:35:00Z' },
  { id: 'job_14', type: 'claim_status', patientName: 'Nancy Lee', payerName: 'Delta Dental', status: 'queued', triggeredBy: 'System Scheduler', startedAt: '2026-04-07T14:36:00Z' },
  { id: 'job_15', type: 'eligibility', patientName: 'Karen White', payerName: 'MetLife', status: 'completed', triggeredBy: 'System Scheduler', startedAt: '2026-04-07T11:45:00Z', duration: 4200 },
];

const statusFilters = ['All', 'Running', 'Completed', 'Failed', 'Queued'];

const statusIcons: Record<JobStatus, typeof CheckCircle2> = {
  completed: CheckCircle2,
  running: Loader2,
  failed: XCircle,
  queued: Clock,
  cancelled: XCircle,
};

export default function AutomationsPage() {
  const [filter, setFilter] = useState('All');
  const router = useRouter();

  const filtered = filter === 'All'
    ? mockJobs
    : mockJobs.filter(j => j.status === filter.toLowerCase());

  const total = mockJobs.length;
  const completed = mockJobs.filter(j => j.status === 'completed').length;
  const running = mockJobs.filter(j => j.status === 'running').length;
  const failed = mockJobs.filter(j => j.status === 'failed').length;
  const avgDuration = mockJobs.filter(j => j.duration).reduce((s, j) => s + (j.duration || 0), 0) / (completed + failed || 1);

  return (
    <div className="automations-page">
      <h1 className="page-title">Automation Jobs</h1>
      <p className="page-subtitle">Monitor browser automation tasks across all workflows</p>

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
                {mockJobs.filter(j => j.status === f.toLowerCase()).length}
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
      `}</style>
    </div>
  );
}
