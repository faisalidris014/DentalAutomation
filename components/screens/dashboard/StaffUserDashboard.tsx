'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { StaffUserKPIs, ApiJob } from '@/types/api';
import {
  ClipboardList,
  Clock,
  TrendingUp,
  ShieldCheck,
  FileSearch,
  BellRing,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Send,
} from 'lucide-react';
import { KPICard } from '@/components/ui/KPICard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatCurrency, formatTime } from '@/lib/formatters';

const statusBadgeMap: Record<string, { variant: 'green' | 'cyan' | 'amber' | 'default'; label: string }> = {
  confirmed: { variant: 'green', label: 'Confirmed' },
  in_progress: { variant: 'cyan', label: 'In Progress' },
  scheduled: { variant: 'default', label: 'Scheduled' },
};

const jobTypeLabels: Record<string, string> = {
  eligibility: 'Eligibility Check',
  eob_retrieval: 'EOB Retrieval',
  claim_submit: 'Claim Submission',
  claim_status: 'Claim Status',
  recall_reminder: 'Recall Reminder',
  patient_sync: 'Patient Sync',
};

const jobStatusMap: Record<string, { variant: 'green' | 'cyan' | 'red' | 'amber'; label: string }> = {
  completed: { variant: 'green', label: 'Completed' },
  running: { variant: 'cyan', label: 'Processing' },
  processing: { variant: 'cyan', label: 'Processing' },
  failed: { variant: 'red', label: 'Failed' },
  queued: { variant: 'amber', label: 'Pending' },
  pending: { variant: 'amber', label: 'Pending' },
};

const jobStatusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 size={16} />,
  running: <Loader2 size={16} />,
  failed: <AlertCircle size={16} />,
  queued: <Clock size={16} />,
};

export function StaffUserDashboard() {
  const router = useRouter();
  const [kpis, setKpis] = useState<StaffUserKPIs | null>(null);
  const [appointments, setAppointments] = useState<{ time: string; patient: string; procedure: string; provider: string; status: string }[]>([]);
  const [recentJobs, setRecentJobs] = useState<{ id: number | string; type: string; patient: string; status: string; icon: React.ReactNode }[]>([]);

  useEffect(() => {
    api.get<{ data: StaffUserKPIs }>('/api/dashboard/kpis')
      .then(res => setKpis(res.data))
      .catch(() => {});

    // Fetch today's appointments
    const today = new Date().toISOString().split('T')[0];
    api.get<{ data: { time?: string; patientName?: string; procedureCode?: string; procedureDescription?: string; provider?: string; status?: string }[] }>(`/api/appointments?date_from=${today}&date_to=${today}`)
      .then(res => {
        setAppointments((res.data || []).map(a => ({
          time: a.time ?? '',
          patient: a.patientName ?? '',
          procedure: `${a.procedureCode ?? ''} - ${a.procedureDescription ?? ''}`,
          provider: a.provider ?? '',
          status: a.status ?? 'scheduled',
        })));
      })
      .catch(() => {});

    // Fetch recent jobs
    api.get<{ data: ApiJob[]; total: number }>('/api/jobs?limit=5')
      .then(res => {
        setRecentJobs(res.data.map(j => ({
          id: j.id,
          type: jobTypeLabels[j.jobType] ?? j.jobType,
          patient: j.relatedEntityId ?? j.id.slice(0, 8),
          status: j.status === 'queued' ? 'pending' : j.status === 'running' ? 'processing' : j.status,
          icon: jobStatusIcons[j.status] ?? <CheckCircle2 size={16} />,
        })));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="staff-user-dashboard">
      <div className="section-title">My Dashboard</div>

      <div className="kpi-grid">
        <div className="kpi-animate" style={{ animationDelay: '0ms' }}>
          <Tooltip content="Automation jobs completed by you today">
            <KPICard
              label="Jobs Completed Today"
              value={kpis?.jobsCompletedToday ?? '—'}
              icon={<ClipboardList size={20} />}
              accentColor="var(--accent)"
            />
          </Tooltip>
        </div>
        <div className="kpi-animate" style={{ animationDelay: '60ms' }}>
          <Tooltip content="Unread notifications for your clinic">
            <KPICard
              label="Unread Notifications"
              value={kpis?.unreadNotifications ?? '—'}
              icon={<Clock size={20} />}
              accentColor="var(--amber)"
            />
          </Tooltip>
        </div>
        <div className="kpi-animate" style={{ animationDelay: '120ms' }}>
          {/* TODO: Wire to real API when success rate endpoint is available */}
          <Tooltip content="Percentage of your jobs today that completed successfully">
            <KPICard
              label="Success Rate"
              value="—"
              icon={<TrendingUp size={20} />}
              accentColor="var(--green)"
            />
          </Tooltip>
        </div>
      </div>

      <div className="main-grid">
        <div className="schedule-section">
          <div className="section-title">Today&apos;s Schedule</div>
          <Card>
            <div className="schedule-table-wrap">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Procedure</th>
                    <th>Provider</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt, i) => {
                    const badge = statusBadgeMap[appt.status] || statusBadgeMap.scheduled;
                    return (
                      <tr key={i}>
                        <td className="mono">{formatTime(appt.time)}</td>
                        <td className="patient-name">{appt.patient}</td>
                        <td className="mono procedure-code">{appt.procedure}</td>
                        <td>{appt.provider}</td>
                        <td>
                          <Badge variant={badge.variant} dot>
                            {badge.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="sidebar-section">
          <div className="section-title">Quick Actions</div>
          <div className="actions-grid">
            <button className="action-btn" onClick={() => router.push('/eligibility')}>
              <ShieldCheck size={18} />
              <span>Run Eligibility Check</span>
            </button>
            <button className="action-btn action-btn--secondary" onClick={() => router.push('/claims?tab=track')}>
              <FileSearch size={18} />
              <span>Check Claim Status</span>
            </button>
            <button className="action-btn action-btn--secondary" onClick={() => router.push('/recalls')}>
              <BellRing size={18} />
              <span>View Recalls</span>
            </button>
          </div>

          <div className="section-title" style={{ marginTop: 'var(--space-lg)' }}>
            Recent Jobs
          </div>
          <Card>
            <div className="jobs-list">
              {recentJobs.map((job) => {
                const status = jobStatusMap[job.status] || jobStatusMap.pending;
                return (
                  <div key={job.id} className="job-item">
                    <div className="job-item__icon" data-status={job.status}>
                      {job.icon}
                    </div>
                    <div className="job-item__content">
                      <span className="job-item__type">{job.type}</span>
                      <span className="job-item__ref mono">{job.patient}</span>
                    </div>
                    <Badge variant={status.variant} size="sm">
                      {status.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <style jsx>{`
        .staff-user-dashboard {
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
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-lg);
        }
        .kpi-animate {
          opacity: 0;
          animation: fadeSlideUp 0.4s ease forwards;
        }
        .main-grid {
          display: grid;
          grid-template-columns: 3fr 2fr;
          gap: var(--space-lg);
          align-items: start;
        }
        .schedule-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .sidebar-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .schedule-table-wrap {
          overflow-x: auto;
        }
        .schedule-table {
          width: 100%;
          border-collapse: collapse;
          font-size: var(--text-sm);
        }
        .schedule-table th {
          text-align: left;
          padding: var(--space-sm) var(--space-md);
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border);
        }
        .schedule-table td {
          padding: var(--space-sm) var(--space-md);
          color: var(--text-secondary);
          border-bottom: 1px solid rgba(148, 163, 184, 0.06);
          white-space: nowrap;
        }
        .schedule-table tr:hover td {
          background: rgba(148, 163, 184, 0.04);
        }
        .patient-name {
          color: var(--text-primary);
          font-weight: 500;
        }
        .procedure-code {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .actions-grid {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
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
        .jobs-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .job-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        .job-item__icon {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: rgba(148, 163, 184, 0.08);
        }
        .job-item__icon[data-status='completed'] {
          color: var(--green);
        }
        .job-item__icon[data-status='processing'] {
          color: var(--accent);
        }
        .job-item__icon[data-status='failed'] {
          color: var(--red);
        }
        .job-item__content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }
        .job-item__type {
          font-size: var(--text-sm);
          color: var(--text-primary);
          font-weight: 500;
        }
        .job-item__ref {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
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
          .main-grid {
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
