'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Loader2, Terminal } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Timeline } from '@/components/ui/Timeline';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDuration, statusColor } from '@/lib/formatters';

const mockJobDetail = {
  id: 'job_1',
  type: 'eligibility' as const,
  patientName: 'Maria Santos',
  payerName: 'Delta Dental',
  status: 'running' as const,
  triggeredBy: 'Jessica Torres',
  startedAt: '2026-04-07T14:32:00Z',
  progress: 65,
  logs: [
    { timestamp: '14:32:01', step: 'Initialize', status: 'success' as const, message: 'Job initialized — Eligibility check for Maria Santos', duration: 120 },
    { timestamp: '14:32:02', step: 'Connect', status: 'success' as const, message: 'Connected to Delta Dental portal (portal.deltadental.com)', duration: 890 },
    { timestamp: '14:32:03', step: 'Authenticate', status: 'success' as const, message: 'Authenticated with service account credentials', duration: 1240 },
    { timestamp: '14:32:05', step: 'Navigate', status: 'success' as const, message: 'Navigated to eligibility verification page', duration: 650 },
    { timestamp: '14:32:06', step: 'Input Data', status: 'success' as const, message: 'Entered patient SSN, DOB, and subscriber ID', duration: 420 },
    { timestamp: '14:32:07', step: 'Submit', status: 'info' as const, message: 'Submitted eligibility request — waiting for response...', duration: 0 },
    { timestamp: '14:32:09', step: 'Parse', status: 'info' as const, message: 'Parsing eligibility response data...', duration: 0 },
  ],
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const job = mockJobDetail;

  const timelineItems = job.logs.map((log, i) => ({
    id: `log_${i}`,
    timestamp: log.timestamp,
    title: log.step,
    description: `${log.message}${log.duration ? ` (${formatDuration(log.duration)})` : ''}`,
    status: log.status,
  }));

  const variant = statusColor(job.status) as 'green' | 'amber' | 'red' | 'cyan';

  return (
    <div className="job-detail-page">
      <button className="back-btn" onClick={() => router.push('/automations')}>
        <ArrowLeft size={16} />
        Back to Jobs
      </button>

      <div className="job-header">
        <div>
          <h1 className="page-title">Job Detail</h1>
          <span className="mono" style={{ color: 'var(--accent-text)', fontSize: 'var(--text-sm)' }}>{params.id || job.id}</span>
        </div>
        <Badge variant={variant} size="md" dot>{job.status}</Badge>
      </div>

      <div className="job-meta-grid">
        <Card>
          <div className="meta-label">Type</div>
          <div className="meta-value">Eligibility Check</div>
        </Card>
        <Card>
          <div className="meta-label">Patient</div>
          <div className="meta-value">{job.patientName}</div>
        </Card>
        <Card>
          <div className="meta-label">Payer</div>
          <div className="meta-value">{job.payerName}</div>
        </Card>
        <Card>
          <div className="meta-label">Triggered By</div>
          <div className="meta-value">{job.triggeredBy}</div>
        </Card>
      </div>

      {job.status === 'running' && job.progress !== undefined && (
        <Card accentColor="var(--accent)">
          <div className="progress-section">
            <div className="progress-header">
              <Loader2 size={16} className="spinning" style={{ color: 'var(--accent)' }} />
              <span>Processing... Step 7 of 10</span>
            </div>
            <ProgressBar value={job.progress} animated showLabel color="var(--accent)" height={8} />
          </div>
        </Card>
      )}

      <Card>
        <div className="logs-header">
          <Terminal size={16} style={{ color: 'var(--text-tertiary)' }} />
          <h3>Execution Log</h3>
        </div>
        <Timeline items={timelineItems} />
      </Card>

      <style jsx>{`
        .job-detail-page {
          max-width: 800px;
          animation: fadeIn var(--transition-base) ease;
        }
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-sm);
          color: var(--text-tertiary);
          margin-bottom: var(--space-md);
          padding: 6px 0;
          transition: color var(--transition-fast);
        }
        .back-btn:hover {
          color: var(--text-primary);
        }
        .job-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-lg);
        }
        .page-title {
          font-size: var(--text-2xl);
          font-weight: 600;
          color: var(--text-primary);
        }
        .job-meta-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }
        .meta-label {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 4px;
        }
        .meta-value {
          font-size: var(--text-base);
          color: var(--text-primary);
          font-weight: 500;
        }
        .progress-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .progress-header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
        .logs-header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-md);
        }
        .logs-header h3 {
          font-size: var(--text-md);
          font-weight: 600;
          color: var(--text-primary);
        }
      `}</style>
      <style jsx global>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
