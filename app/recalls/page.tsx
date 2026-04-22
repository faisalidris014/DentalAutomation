'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Send,
  Mail,
  MessageSquare,
  Phone,
  MailOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  CalendarClock,
  Users,
  BarChart3,
  Loader2,
  Settings2,
} from 'lucide-react';
import { KPICard } from '@/components/ui/KPICard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { NavPill } from '@/components/ui/NavPill';
import { Avatar } from '@/components/ui/Avatar';
import { getRecalls, sendRecallReminder } from '@/lib/mockApi';
import { formatDate, statusColor, getInitials } from '@/lib/formatters';
import { useRole } from '@/context/RoleContext';
import type { Recall } from '@/types';

type RecallFilter = 'All' | 'Prophy' | 'Perio' | 'Child Prophy';

const contactIcons: Record<string, React.ReactNode> = {
  email: <Mail size={14} />,
  sms: <MessageSquare size={14} />,
  phone: <Phone size={14} />,
  mail: <MailOpen size={14} />,
};

function daysOverdueColor(days: number): string {
  if (days > 60) return 'var(--red)';
  if (days > 14) return 'var(--amber)';
  return 'var(--green)';
}

export default function RecallsPage() {
  const { role, currentClinic } = useRole();
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RecallFilter>('All');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sendingAll, setSendingAll] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [intervals, setIntervals] = useState({ first: 7, second: 14, third: 30 });
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    getRecalls(currentClinic.id).then(data => {
      setRecalls(data);
      setLoading(false);
    });
  }, [currentClinic.id]);

  const filtered = filter === 'All'
    ? recalls
    : recalls.filter(r => r.recallType === filter);

  const totalOverdue = recalls.filter(r => r.daysOverdue > 0).length;
  const dueThisWeek = recalls.filter(r => r.daysOverdue >= 0 && r.daysOverdue <= 7).length;
  const remindersSentToday = recalls.filter(r => {
    if (!r.lastReminderDate) return false;
    const today = new Date().toISOString().slice(0, 10);
    return r.lastReminderDate.slice(0, 10) === today;
  }).length;
  const totalWithReminders = recalls.filter(r => r.reminderCount > 0).length;
  const scheduledFromReminders = recalls.filter(r => r.status === 'scheduled').length;
  const responseRate = totalWithReminders > 0
    ? ((scheduledFromReminders / totalWithReminders) * 100).toFixed(1)
    : '0.0';

  const handleSendReminder = useCallback(async (recallId: string) => {
    setSendingId(recallId);
    await sendRecallReminder(recallId);
    setSendingId(null);
    setSentIds(prev => new Set(prev).add(recallId));
  }, []);

  const handleSendAll = useCallback(async () => {
    setSendingAll(true);
    const pending = filtered.filter(
      r => r.status === 'pending' || r.status === 'reminder_sent'
    );
    for (const r of pending) {
      setSendingId(r.id);
      await sendRecallReminder(r.id);
      setSentIds(prev => new Set(prev).add(r.id));
    }
    setSendingId(null);
    setSendingAll(false);
  }, [filtered]);

  return (
    <div className="recalls-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Recall Management</h1>
          <p className="page-subtitle">Track and automate patient recall reminders</p>
        </div>
        <button
          className="btn-primary"
          onClick={handleSendAll}
          disabled={sendingAll}
        >
          {sendingAll ? (
            <><Loader2 size={16} className="spin-icon" /> Sending...</>
          ) : (
            <><Send size={16} /> Send All Reminders</>
          )}
        </button>
      </div>

      {/* KPI Summary */}
      <div className="kpi-grid">
        <KPICard
          label="Total Overdue"
          value={totalOverdue}
          icon={<Users size={18} />}
          accentColor="var(--red)"
          delta={`${recalls.filter(r => r.daysOverdue > 60).length} critical`}
          deltaType="negative"
        />
        <KPICard
          label="Due This Week"
          value={dueThisWeek}
          icon={<CalendarClock size={18} />}
          accentColor="var(--amber)"
        />
        <KPICard
          label="Reminders Sent Today"
          value={remindersSentToday}
          icon={<Bell size={18} />}
          accentColor="var(--accent)"
        />
        <KPICard
          label="Response Rate"
          value={`${responseRate}%`}
          icon={<BarChart3 size={18} />}
          accentColor="var(--green)"
        />
      </div>

      {/* Filters */}
      <div className="filter-bar">
        {(['All', 'Prophy', 'Perio', 'Child Prophy'] as RecallFilter[]).map(f => (
          <NavPill key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </NavPill>
        ))}
        <span className="filter-count">{filtered.length} recalls</span>
      </div>

      {/* Recall List */}
      <div className="recall-list">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-row skeleton" />
          ))
        ) : filtered.length === 0 ? (
          <Card>
            <div className="empty-state">No recalls found for this filter.</div>
          </Card>
        ) : (
          filtered.map((recall, idx) => (
            <Card
              key={recall.id}
              padding="var(--space-md)"
              hoverable
              className={`recall-row stagger-${Math.min(idx + 1, 8)}`}
            >
              <div className="recall-row-inner">
                <div className="recall-patient">
                  <Avatar initials={getInitials(recall.patientName)} size={34} />
                  <div className="recall-patient-info">
                    <span className="recall-patient-name">{recall.patientName}</span>
                    <span className="recall-patient-contact">
                      {recall.contactMethod === 'email' ? recall.email || recall.phone : recall.phone}
                    </span>
                  </div>
                </div>

                <div className="recall-type">
                  <Badge variant="purple">{recall.recallType}</Badge>
                </div>

                <div className="recall-overdue">
                  <span
                    className="overdue-days mono"
                    style={{ color: daysOverdueColor(recall.daysOverdue) }}
                  >
                    {recall.daysOverdue > 0 ? `${recall.daysOverdue}d overdue` : 'Current'}
                  </span>
                </div>

                <div className="recall-reminder-info">
                  <span className="recall-last-reminder">
                    {recall.lastReminderDate ? formatDate(recall.lastReminderDate) : 'None'}
                  </span>
                  <span className="recall-reminder-count mono">
                    {recall.reminderCount}/3 sent
                  </span>
                </div>

                <div className="recall-contact-method">
                  <span className="contact-icon">{contactIcons[recall.contactMethod]}</span>
                </div>

                <div className="recall-status">
                  <Badge
                    variant={statusColor(recall.status) as 'green' | 'amber' | 'red' | 'cyan' | 'purple' | 'default'}
                    dot
                  >
                    {recall.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="recall-action">
                  {sentIds.has(recall.id) ? (
                    <span className="sent-confirm">Reminder Sent &#10003;</span>
                  ) : sendingId === recall.id ? (
                    <button className="btn-send btn-send--loading" disabled>
                      <Loader2 size={14} className="spin-icon" />
                    </button>
                  ) : (
                    <button
                      className="btn-send"
                      onClick={() => handleSendReminder(recall.id)}
                      title="Send Reminder"
                    >
                      <Send size={14} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Automation Settings — visible to admins only */}
      {(role === 'staff_admin' || role === 'it_admin') && (
      <Card padding="0" className="automation-card">
        <button
          className="automation-toggle"
          onClick={() => setSettingsOpen(prev => !prev)}
        >
          <div className="automation-toggle-left">
            <Settings2 size={18} />
            <span className="automation-toggle-title">Automation Settings</span>
          </div>
          {settingsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {settingsOpen && (
          <div className="automation-body">
            <p className="automation-desc">
              Automated reminder schedule for overdue recalls. Reminders are sent
              automatically based on the configured intervals below.
            </p>
            <div className="schedule-grid">
              {([
                { step: '1st Reminder', key: 'first' as const, icon: <Clock size={16} /> },
                { step: '2nd Reminder', key: 'second' as const, icon: <Clock size={16} /> },
                { step: '3rd Reminder', key: 'third' as const, icon: <Clock size={16} /> },
              ]).map((s, i) => (
                <div key={i} className="schedule-item">
                  <div className="schedule-icon">{s.icon}</div>
                  <div className="schedule-detail">
                    <span className="schedule-step">{s.step}</span>
                    <div className="schedule-select-wrap">
                      <select
                        className="schedule-select"
                        value={intervals[s.key]}
                        onChange={e => setIntervals(prev => ({ ...prev, [s.key]: Number(e.target.value) }))}
                      >
                        {[3, 5, 7, 10, 14, 21, 30, 45, 60].map(d => (
                          <option key={d} value={d}>{d} days overdue</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Badge variant="cyan" size="sm">Active</Badge>
                </div>
              ))}
            </div>
            <div className="schedule-actions">
              <button
                className="btn-save-settings"
                onClick={() => { setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 3000); }}
              >
                {settingsSaved ? 'Settings Saved \u2713' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </Card>
      )}

      <style jsx>{`
        .recalls-page {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-md);
          flex-wrap: wrap;
        }
        .page-title {
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--text-primary);
        }
        .page-subtitle {
          font-size: var(--text-sm);
          color: var(--text-tertiary);
          margin-top: 2px;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: var(--accent);
          color: var(--bg-deepest);
          font-weight: 600;
          font-size: var(--text-sm);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          border: none;
        }
        .btn-primary:hover:not(:disabled) {
          background: var(--accent-hover);
          box-shadow: var(--shadow-glow);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* KPI Grid */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
        }
        @media (max-width: 900px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 520px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Filter Bar */
        .filter-bar {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          flex-wrap: wrap;
        }
        .filter-count {
          margin-left: auto;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }

        /* Recall List */
        .recall-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        .skeleton-row {
          height: 64px;
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-sm);
        }
        .empty-state {
          text-align: center;
          padding: var(--space-xl);
          color: var(--text-tertiary);
          font-size: var(--text-sm);
        }

        /* Recall Row */
        .recall-row-inner {
          display: grid;
          grid-template-columns: 2fr 1fr 1.2fr 1.5fr 40px 1fr 48px;
          align-items: center;
          gap: var(--space-md);
        }
        @media (max-width: 900px) {
          .recall-row-inner {
            grid-template-columns: 1fr 1fr;
            gap: var(--space-sm);
          }
          .recall-contact-method,
          .recall-reminder-info {
            display: none;
          }
        }
        .recall-patient {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        .recall-patient-info {
          display: flex;
          flex-direction: column;
        }
        .recall-patient-name {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
        }
        .recall-patient-contact {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .recall-type {
          display: flex;
          align-items: center;
        }
        .recall-overdue {
          display: flex;
          align-items: center;
        }
        .overdue-days {
          font-size: var(--text-sm);
          font-weight: 600;
        }
        .recall-reminder-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .recall-last-reminder {
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }
        .recall-reminder-count {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .recall-contact-method {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .contact-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
        }
        .recall-status {
          display: flex;
          align-items: center;
        }
        .recall-action {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        .btn-send {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          color: var(--accent-text);
          background: var(--accent-dim);
          border: 1px solid rgba(34, 211, 238, 0.15);
          transition: all var(--transition-fast);
        }
        .btn-send:hover:not(:disabled) {
          background: rgba(34, 211, 238, 0.25);
          box-shadow: 0 0 12px rgba(34, 211, 238, 0.2);
        }
        .btn-send--loading {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .sent-confirm {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--green);
          white-space: nowrap;
          animation: fadeIn var(--transition-base) ease forwards;
        }

        /* Spinner */
        .recalls-page :global(.spin-icon) {
          animation: spin 1s linear infinite;
        }

        /* Automation Settings */
        .automation-card {
          margin-top: var(--space-sm);
        }
        .automation-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: var(--space-lg);
          cursor: pointer;
          color: var(--text-primary);
          transition: background var(--transition-fast);
        }
        .automation-toggle:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .automation-toggle-left {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        .automation-toggle-title {
          font-size: var(--text-base);
          font-weight: 600;
        }
        .automation-body {
          padding: 0 var(--space-lg) var(--space-lg);
          animation: fadeIn var(--transition-base) ease forwards;
        }
        .automation-desc {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin-bottom: var(--space-lg);
          line-height: 1.6;
        }
        .schedule-grid {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        .schedule-item {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md);
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
        }
        .schedule-icon {
          color: var(--accent-text);
          display: flex;
          align-items: center;
        }
        .schedule-detail {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .schedule-step {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
        }
        .schedule-days {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .schedule-select-wrap {
          margin-top: 2px;
        }
        .schedule-select {
          padding: 4px 8px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: var(--text-xs);
          font-family: var(--font-mono);
          cursor: pointer;
          transition: border-color var(--transition-fast);
        }
        .schedule-select:focus {
          border-color: var(--accent);
          outline: none;
        }
        .schedule-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: var(--space-md);
        }
        .btn-save-settings {
          padding: 8px 20px;
          background: var(--accent);
          color: var(--bg-deepest);
          font-weight: 600;
          font-size: var(--text-sm);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }
        .btn-save-settings:hover {
          background: var(--accent-hover);
          box-shadow: var(--shadow-glow);
        }
      `}</style>
    </div>
  );
}
