'use client';

import {
  DollarSign,
  Wallet,
  BellRing,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Send,
  Clock,
  AlertCircle,
  CreditCard,
  UserCheck,
  Calendar,
  PhoneCall,
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { KPICard } from '@/components/ui/KPICard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatTime, formatRelativeTime } from '@/lib/formatters';

ChartJS.register(ArcElement, Tooltip, Legend);

const appointments = [
  { time: '08:00', patient: 'Maria Santos', procedure: 'D0120 - Periodic Oral Eval', provider: 'Dr. Mitchell', status: 'confirmed' },
  { time: '08:30', patient: 'James Wilson', procedure: 'D1110 - Prophylaxis Adult', provider: 'Sarah H.', status: 'confirmed' },
  { time: '09:00', patient: 'Robert Chen', procedure: 'D2391 - Post Composite 1 Surf', provider: 'Dr. Mitchell', status: 'in_progress' },
  { time: '09:30', patient: 'Emily Rodriguez', procedure: 'D2740 - Crown Porcelain', provider: 'Dr. Mitchell', status: 'scheduled' },
  { time: '10:00', patient: 'David Thompson', procedure: 'D0274 - Bitewings 4 Films', provider: 'Sarah H.', status: 'scheduled' },
  { time: '10:30', patient: 'Lisa Nakamura', procedure: 'D4341 - Perio Scaling 4+ Teeth', provider: 'Dr. Mitchell', status: 'scheduled' },
  { time: '11:00', patient: 'Michael Brown', procedure: 'D0220 - Periapical First Film', provider: 'Sarah H.', status: 'scheduled' },
  { time: '14:00', patient: 'Sarah Kim', procedure: 'D1110 - Prophylaxis Adult', provider: 'Sarah H.', status: 'scheduled' },
];

const statusBadgeMap: Record<string, { variant: 'green' | 'cyan' | 'amber' | 'default'; label: string }> = {
  confirmed: { variant: 'green', label: 'Confirmed' },
  in_progress: { variant: 'cyan', label: 'In Progress' },
  scheduled: { variant: 'default', label: 'Scheduled' },
  completed: { variant: 'green', label: 'Completed' },
  cancelled: { variant: 'red' as 'green', label: 'Cancelled' },
  no_show: { variant: 'red' as 'green', label: 'No Show' },
};

const activityFeed = [
  { icon: <ShieldCheck size={16} />, message: 'Eligibility verified for Maria Santos', time: new Date(Date.now() - 60000 * 5).toISOString(), color: 'var(--green)' },
  { icon: <FileCheck size={16} />, message: 'Claim CLM-4521 approved by Delta Dental', time: new Date(Date.now() - 60000 * 18).toISOString(), color: 'var(--green)' },
  { icon: <Send size={16} />, message: 'Recall reminder sent to James Wilson', time: new Date(Date.now() - 60000 * 35).toISOString(), color: 'var(--accent)' },
  { icon: <CreditCard size={16} />, message: 'ERA posted: $1,240 from Aetna', time: new Date(Date.now() - 60000 * 52).toISOString(), color: 'var(--purple)' },
  { icon: <UserCheck size={16} />, message: 'Patient Robert Chen checked in', time: new Date(Date.now() - 60000 * 68).toISOString(), color: 'var(--accent)' },
  { icon: <AlertCircle size={16} />, message: 'Insurance lapsed: David Thompson (MetLife)', time: new Date(Date.now() - 3600000 * 1.5).toISOString(), color: 'var(--amber)' },
  { icon: <PhoneCall size={16} />, message: 'Confirmation call completed: Emily Rodriguez', time: new Date(Date.now() - 3600000 * 2).toISOString(), color: 'var(--green)' },
  { icon: <Calendar size={16} />, message: 'Appointment rescheduled: Lisa Nakamura to 10:30 AM', time: new Date(Date.now() - 3600000 * 3).toISOString(), color: 'var(--amber)' },
];

const claimChartData = {
  labels: ['Paid', 'Processing', 'Denied'],
  datasets: [
    {
      data: [12, 4, 2],
      backgroundColor: [
        'rgba(52, 211, 153, 0.8)',
        'rgba(34, 211, 238, 0.8)',
        'rgba(248, 113, 113, 0.8)',
      ],
      borderColor: [
        'rgba(52, 211, 153, 1)',
        'rgba(34, 211, 238, 1)',
        'rgba(248, 113, 113, 1)',
      ],
      borderWidth: 1,
      hoverOffset: 6,
    },
  ],
};

const claimChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: 'rgba(148, 163, 184, 0.8)',
        padding: 16,
        usePointStyle: true,
        pointStyleWidth: 8,
        font: { size: 12 },
      },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(148, 163, 184, 0.15)',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
      padding: 10,
      cornerRadius: 8,
    },
  },
};

export function StaffAdminDashboard() {
  return (
    <div className="staff-admin-dashboard">
      <div className="section-title">Bright Smiles Dental</div>

      <div className="kpi-grid">
        <div className="kpi-animate" style={{ animationDelay: '0ms' }}>
          <KPICard
            label="Today's Production"
            value={formatCurrency(12450)}
            icon={<DollarSign size={20} />}
            accentColor="var(--green)"
          />
        </div>
        <div className="kpi-animate" style={{ animationDelay: '60ms' }}>
          <KPICard
            label="MTD Collections"
            value={formatCurrency(87320)}
            icon={<Wallet size={20} />}
            accentColor="var(--accent)"
            delta="+12.3% vs last month"
            deltaType="positive"
          />
        </div>
        <div className="kpi-animate" style={{ animationDelay: '120ms' }}>
          <KPICard
            label="Overdue Recalls"
            value={23}
            icon={<BellRing size={20} />}
            accentColor="var(--amber)"
          />
        </div>
        <div className="kpi-animate" style={{ animationDelay: '180ms' }}>
          <KPICard
            label="Unverified Insurance"
            value={8}
            icon={<ShieldCheck size={20} />}
            accentColor="var(--red)"
          />
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
          <div className="section-title">Claim Status</div>
          <Card>
            <div className="chart-container">
              <Doughnut data={claimChartData} options={claimChartOptions} />
            </div>
            <div className="chart-total">
              <span className="chart-total__number mono">18</span>
              <span className="chart-total__label">Total Claims</span>
            </div>
          </Card>

          <div className="section-title" style={{ marginTop: 'var(--space-lg)' }}>
            Automation Activity
          </div>
          <Card>
            <div className="activity-list">
              {activityFeed.map((item, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-item__icon" style={{ color: item.color }}>
                    {item.icon}
                  </div>
                  <div className="activity-item__content">
                    <span className="activity-item__message">{item.message}</span>
                    <span className="activity-item__time">{formatRelativeTime(item.time)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <style jsx>{`
        .staff-admin-dashboard {
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
        .chart-container {
          height: 180px;
          position: relative;
        }
        .chart-total {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: var(--space-sm);
        }
        .chart-total__number {
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--text-primary);
        }
        .chart-total__label {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .activity-item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-sm);
        }
        .activity-item__icon {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: rgba(148, 163, 184, 0.08);
        }
        .activity-item__content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }
        .activity-item__message {
          font-size: var(--text-sm);
          color: var(--text-primary);
          line-height: 1.4;
        }
        .activity-item__time {
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
