'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Shield, Calendar, FileText, MessageSquare,
  Mail, Phone, MapPin, User as UserIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { NavPill } from '@/components/ui/NavPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { Timeline } from '@/components/ui/Timeline';
import { useRole } from '@/context/RoleContext';
import { getPatient } from '@/lib/mockApi';
import { formatCurrency, formatDate, formatPhone, getInitials } from '@/lib/formatters';
import type { Patient } from '@/types';

type Tab = 'insurance' | 'appointments' | 'claims' | 'communications';

const mockAppointments = [
  { id: 'a1', date: '2026-03-12', procedure: 'D0120 - Periodic Oral Exam', provider: 'Dr. Sarah Mitchell', fee: 65, status: 'completed' },
  { id: 'a2', date: '2026-03-12', procedure: 'D1110 - Adult Prophylaxis', provider: 'Lisa Chen, RDH', fee: 115, status: 'completed' },
  { id: 'a3', date: '2025-10-15', procedure: 'D2392 - Resin Composite (2s, posterior)', provider: 'Dr. Sarah Mitchell', fee: 245, status: 'completed' },
  { id: 'a4', date: '2025-10-15', procedure: 'D0274 - Bitewings (4 images)', provider: 'Lisa Chen, RDH', fee: 72, status: 'completed' },
  { id: 'a5', date: '2025-04-08', procedure: 'D0120 - Periodic Oral Exam', provider: 'Dr. Sarah Mitchell', fee: 65, status: 'completed' },
  { id: 'a6', date: '2025-04-08', procedure: 'D1110 - Adult Prophylaxis', provider: 'Lisa Chen, RDH', fee: 115, status: 'completed' },
];

const mockClaims = [
  { id: 'c1', date: '2026-03-12', payer: 'Delta Dental PPO', amount: 180, status: 'paid' },
  { id: 'c2', date: '2025-10-15', payer: 'Delta Dental PPO', amount: 317, status: 'paid' },
  { id: 'c3', date: '2025-04-08', payer: 'Delta Dental PPO', amount: 180, status: 'paid' },
  { id: 'c4', date: '2024-10-10', payer: 'Delta Dental PPO', amount: 455, status: 'denied' },
];

const mockCommunications = [
  {
    id: 'comm1',
    timestamp: 'Mar 10, 2026',
    title: 'Appointment Reminder Sent',
    description: 'Automated SMS reminder for March 12th cleaning appointment.',
    status: 'success' as const,
  },
  {
    id: 'comm2',
    timestamp: 'Mar 5, 2026',
    title: 'Insurance Verification Completed',
    description: 'Eligibility confirmed with Delta Dental. Coverage active through 12/31/2026.',
    status: 'info' as const,
  },
  {
    id: 'comm3',
    timestamp: 'Feb 20, 2026',
    title: 'Recall Notice Sent',
    description: 'Email recall notice sent for overdue prophylaxis appointment.',
    status: 'warning' as const,
  },
  {
    id: 'comm4',
    timestamp: 'Oct 16, 2025',
    title: 'Statement Sent',
    description: 'Patient statement mailed for outstanding balance of $45.00.',
    status: 'info' as const,
  },
  {
    id: 'comm5',
    timestamp: 'Oct 15, 2025',
    title: 'Claim Submitted',
    description: 'Claim CLM-2025-10-15 submitted electronically to Delta Dental.',
    status: 'success' as const,
  },
];

const claimStatusVariant = (status: string) => {
  switch (status) {
    case 'paid':
    case 'approved':
      return 'green' as const;
    case 'submitted':
    case 'processing':
      return 'amber' as const;
    case 'denied':
      return 'red' as const;
    default:
      return 'default' as const;
  }
};

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentClinic } = useRole();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('insurance');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const data = await getPatient(params.id as string);
      if (!cancelled) {
        setPatient(data ?? null);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [params.id]);

  if (loading) {
    return (
      <div className="detail-page">
        <div className="skeleton-header">
          <div className="skeleton skeleton-avatar-lg" />
          <div className="skeleton-header-lines">
            <div className="skeleton skeleton-line-xl" />
            <div className="skeleton skeleton-line-md" />
            <div className="skeleton skeleton-line-sm" />
          </div>
        </div>
        <style jsx>{`
          .detail-page {
            display: flex;
            flex-direction: column;
            gap: var(--space-lg);
            animation: fadeIn var(--transition-base) ease forwards;
          }
          .skeleton-header {
            display: flex;
            gap: var(--space-lg);
            align-items: center;
          }
          .skeleton-avatar-lg {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .skeleton-header-lines {
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
            flex: 1;
          }
          .skeleton-line-xl { height: 18px; width: 200px; border-radius: var(--radius-sm); }
          .skeleton-line-md { height: 12px; width: 300px; border-radius: var(--radius-sm); }
          .skeleton-line-sm { height: 10px; width: 180px; border-radius: var(--radius-sm); }
          .skeleton {
            background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s ease infinite;
          }
        `}</style>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="detail-page">
        <Card>
          <EmptyState
            icon={<UserIcon size={40} />}
            title="Patient Not Found"
            description="The patient record could not be located."
            action={
              <button className="back-btn" onClick={() => router.push('/patients')}>
                Back to Patients
              </button>
            }
          />
        </Card>
        <style jsx>{`
          .detail-page {
            animation: fadeIn var(--transition-base) ease forwards;
          }
          .back-btn {
            padding: 8px 20px;
            background: var(--accent);
            color: var(--bg-deepest);
            border-radius: var(--radius-md);
            font-weight: 600;
            font-size: var(--text-sm);
          }
        `}</style>
      </div>
    );
  }

  const fullName = `${patient.firstName} ${patient.lastName}`;
  const addr =
    typeof patient.address === 'string'
      ? patient.address
      : patient.address
      ? `${(patient.address as { street: string; city: string; state: string; zip: string }).street}, ${(patient.address as { street: string; city: string; state: string; zip: string }).city}, ${(patient.address as { street: string; city: string; state: string; zip: string }).state} ${(patient.address as { street: string; city: string; state: string; zip: string }).zip}`
      : '';
  const genderLabel = patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender;

  return (
    <div className="detail-page">
      {/* Back button */}
      <button className="back-link" onClick={() => router.push('/patients')}>
        <ArrowLeft size={16} />
        <span>All Patients</span>
      </button>

      {/* Patient header */}
      <Card>
        <div className="patient-header">
          <Avatar initials={getInitials(fullName)} size={56} />
          <div className="patient-header__info">
            <h1 className="patient-header__name">{fullName}</h1>
            <div className="patient-header__meta">
              <span className="meta-item mono">
                DOB: {formatDate(patient.dob)}
              </span>
              <span className="meta-divider" />
              <span className="meta-item">{genderLabel}</span>
              <span className="meta-divider" />
              <span className="meta-item mono">
                <Phone size={12} /> {formatPhone(patient.phone)}
              </span>
              {patient.email && (
                <>
                  <span className="meta-divider" />
                  <span className="meta-item">
                    <Mail size={12} /> {patient.email}
                  </span>
                </>
              )}
            </div>
            {addr && (
              <div className="patient-header__address">
                <MapPin size={12} />
                <span>{addr}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tab navigation */}
      <div className="tab-bar">
        <NavPill
          active={activeTab === 'insurance'}
          onClick={() => setActiveTab('insurance')}
          icon={<Shield size={14} />}
        >
          Insurance
        </NavPill>
        <NavPill
          active={activeTab === 'appointments'}
          onClick={() => setActiveTab('appointments')}
          icon={<Calendar size={14} />}
        >
          Appointments
        </NavPill>
        <NavPill
          active={activeTab === 'claims'}
          onClick={() => setActiveTab('claims')}
          icon={<FileText size={14} />}
        >
          Claims
        </NavPill>
        <NavPill
          active={activeTab === 'communications'}
          onClick={() => setActiveTab('communications')}
          icon={<MessageSquare size={14} />}
        >
          Communications
        </NavPill>
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === 'insurance' && <InsuranceTab patient={patient} />}
        {activeTab === 'appointments' && <AppointmentsTab />}
        {activeTab === 'claims' && <ClaimsTab />}
        {activeTab === 'communications' && <CommunicationsTab />}
      </div>

      <style jsx>{`
        .detail-page {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
          animation: fadeIn var(--transition-base) ease forwards;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: var(--space-xs);
          font-size: var(--text-sm);
          color: var(--text-tertiary);
          transition: color var(--transition-fast);
          align-self: flex-start;
        }
        .back-link:hover {
          color: var(--accent-text);
        }
        .patient-header {
          display: flex;
          align-items: flex-start;
          gap: var(--space-lg);
        }
        .patient-header__info {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
          min-width: 0;
        }
        .patient-header__name {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--text-primary);
        }
        .patient-header__meta {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          flex-wrap: wrap;
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
        .meta-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .meta-divider {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--text-muted);
        }
        .patient-header__address {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          margin-top: 2px;
        }
        .tab-bar {
          display: flex;
          gap: var(--space-sm);
          flex-wrap: wrap;
        }
        .tab-content {
          animation: fadeIn var(--transition-fast) ease forwards;
        }
      `}</style>
    </div>
  );
}

/* ===================== Insurance Tab ===================== */
function InsuranceTab({ patient }: { patient: Patient }) {
  const pri = patient.primaryInsurance;
  const sec = patient.secondaryInsurance;

  if (!pri && !sec) {
    return (
      <Card>
        <EmptyState
          icon={<Shield size={40} />}
          title="No Insurance on File"
          description="This patient does not have insurance information recorded."
        />
      </Card>
    );
  }

  return (
    <div className="insurance-grid">
      {pri && <InsuranceCard label="Primary Insurance" info={pri} />}
      {sec && <InsuranceCard label="Secondary Insurance" info={sec} />}

      <style jsx>{`
        .insurance-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: var(--space-lg);
        }
      `}</style>
    </div>
  );
}

function InsuranceCard({
  label,
  info,
}: {
  label: string;
  info: NonNullable<Patient['primaryInsurance']>;
}) {
  return (
    <Card accentColor="var(--accent)">
      <div className="ins-card">
        <h3 className="ins-card__label">{label}</h3>
        <div className="ins-card__carrier">{info.carrierName}</div>
        <div className="ins-card__rows">
          <div className="ins-row">
            <span className="ins-row__key">Plan Type</span>
            <span className="ins-row__val">{info.planType}</span>
          </div>
          <div className="ins-row">
            <span className="ins-row__key">Plan Name</span>
            <span className="ins-row__val">{info.planName}</span>
          </div>
          <div className="ins-row">
            <span className="ins-row__key">Subscriber ID</span>
            <span className="ins-row__val mono">{info.subscriberId}</span>
          </div>
          <div className="ins-row">
            <span className="ins-row__key">Group #</span>
            <span className="ins-row__val mono">{info.groupNumber}</span>
          </div>
          <div className="ins-row">
            <span className="ins-row__key">Effective Date</span>
            <span className="ins-row__val mono">{formatDate(info.effectiveDate)}</span>
          </div>
          <div className="ins-row">
            <span className="ins-row__key">Relationship</span>
            <span className="ins-row__val">
              {info.relationship.charAt(0).toUpperCase() + info.relationship.slice(1)}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ins-card {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .ins-card__label {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
        }
        .ins-card__carrier {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--text-primary);
        }
        .ins-card__rows {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        .ins-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-xs) 0;
          border-bottom: 1px solid var(--border);
        }
        .ins-row:last-child {
          border-bottom: none;
        }
        .ins-row__key {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .ins-row__val {
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
      `}</style>
    </Card>
  );
}

/* ===================== Appointments Tab ===================== */
function AppointmentsTab() {
  return (
    <Card>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Procedure</th>
              <th>Provider</th>
              <th>Fee</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {mockAppointments.map((appt) => (
              <tr key={appt.id}>
                <td className="mono">{formatDate(appt.date)}</td>
                <td>{appt.procedure}</td>
                <td>{appt.provider}</td>
                <td className="mono">{formatCurrency(appt.fee)}</td>
                <td>
                  <Badge variant="green" size="sm">
                    {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .table-wrap {
          overflow-x: auto;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table th {
          text-align: left;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
          padding: var(--space-sm) var(--space-md);
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .data-table td {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          padding: var(--space-sm) var(--space-md);
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .data-table tbody tr {
          transition: background var(--transition-fast);
        }
        .data-table tbody tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .data-table tbody tr:last-child td {
          border-bottom: none;
        }
      `}</style>
    </Card>
  );
}

/* ===================== Claims Tab ===================== */
function ClaimsTab() {
  return (
    <Card>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Payer</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {mockClaims.map((claim) => (
              <tr key={claim.id}>
                <td className="mono">{formatDate(claim.date)}</td>
                <td>{claim.payer}</td>
                <td className="mono">{formatCurrency(claim.amount)}</td>
                <td>
                  <Badge variant={claimStatusVariant(claim.status)} dot>
                    {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .table-wrap {
          overflow-x: auto;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table th {
          text-align: left;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
          padding: var(--space-sm) var(--space-md);
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .data-table td {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          padding: var(--space-sm) var(--space-md);
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .data-table tbody tr {
          transition: background var(--transition-fast);
        }
        .data-table tbody tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .data-table tbody tr:last-child td {
          border-bottom: none;
        }
      `}</style>
    </Card>
  );
}

/* ===================== Communications Tab ===================== */
function CommunicationsTab() {
  return (
    <Card>
      <Timeline items={mockCommunications} />
    </Card>
  );
}
