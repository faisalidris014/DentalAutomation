'use client';

import { useState } from 'react';
import { Settings, Building2, Shield, Users, Bell, Key, ToggleLeft, ToggleRight, FileText, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { NavPill } from '@/components/ui/NavPill';
import { Avatar } from '@/components/ui/Avatar';
import { useRole } from '@/context/RoleContext';

const payers = [
  { name: 'Delta Dental', status: 'active', features: ['Eligibility', 'Claims', 'EOB'] },
  { name: 'Cigna', status: 'active', features: ['Eligibility', 'Claims', 'EOB'] },
  { name: 'MetLife', status: 'active', features: ['Eligibility', 'Claims'] },
  { name: 'Aetna', status: 'coming_soon', features: [] },
  { name: 'Guardian', status: 'coming_soon', features: [] },
];

const staffUsers = [
  { name: 'Dr. Sarah Mitchell', email: 'sarah@brightsmiles.com', role: 'Staff Admin', initials: 'SM' },
  { name: 'Jessica Torres', email: 'jessica@brightsmiles.com', role: 'Staff User', initials: 'JT' },
  { name: 'Michael Rivera', email: 'michael@brightsmiles.com', role: 'Staff User', initials: 'MR' },
  { name: 'Ashley Johnson', email: 'ashley@brightsmiles.com', role: 'Staff User', initials: 'AJ' },
];

const auditLog = [
  { time: '2026-04-07 14:30', user: 'Jessica Torres', action: 'Ran eligibility check', target: 'Maria Santos' },
  { time: '2026-04-07 14:15', user: 'Dr. Sarah Mitchell', action: 'Submitted claim', target: 'CLM-7823' },
  { time: '2026-04-07 13:45', user: 'System', action: 'EOB sync completed', target: 'Delta Dental' },
  { time: '2026-04-07 12:30', user: 'Jessica Torres', action: 'Sent recall reminders', target: '5 patients' },
  { time: '2026-04-07 10:00', user: 'System', action: 'Patient sync completed', target: '142 records' },
  { time: '2026-04-06 17:00', user: 'Dr. Sarah Mitchell', action: 'Updated payer credentials', target: 'Cigna' },
];

export default function SettingsPage() {
  const { role } = useRole();
  const [activeTab, setActiveTab] = useState(role === 'it_admin' ? 'clinics' : 'profile');
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});

  const itAdminTabs = [
    { id: 'clinics', label: 'Clinics', icon: Building2 },
    { id: 'payers', label: 'Payer Adapters', icon: Shield },
    { id: 'features', label: 'Feature Flags', icon: ToggleLeft },
    { id: 'users', label: 'Users', icon: Users },
  ];

  const staffAdminTabs = [
    { id: 'profile', label: 'Clinic Profile', icon: Building2 },
    { id: 'payers', label: 'Payer Credentials', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'users', label: 'Staff Users', icon: Users },
    { id: 'audit', label: 'Audit Log', icon: FileText },
  ];

  const tabs = role === 'it_admin' ? itAdminTabs : staffAdminTabs;

  return (
    <div className="settings-page">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">{role === 'it_admin' ? 'System-wide configuration' : 'Clinic settings and preferences'}</p>

      <div className="settings-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <NavPill key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} icon={<Icon size={14} />}>
              {tab.label}
            </NavPill>
          );
        })}
      </div>

      <div className="settings-content">
        {activeTab === 'clinics' && role === 'it_admin' && (
          <Card>
            <h3 className="section-title">Managed Clinics</h3>
            <div className="clinic-list">
              {['Bright Smiles Dental', 'Lakewood Family Dentistry', 'North Star Dental Group'].map(name => (
                <div key={name} className="settings-row">
                  <div>
                    <span className="row-title">{name}</span>
                    <span className="row-sub">Active — Agent deployed</span>
                  </div>
                  <button className="btn-ghost-sm">Configure</button>
                </div>
              ))}
            </div>
            <button className="btn-accent" style={{ marginTop: 'var(--space-md)' }}>+ Add Clinic</button>
          </Card>
        )}

        {activeTab === 'profile' && role === 'staff_admin' && (
          <Card>
            <h3 className="section-title">Clinic Profile</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Clinic Name</label>
                <div className="form-input">Bright Smiles Dental</div>
              </div>
              <div className="form-group">
                <label>NPI</label>
                <div className="form-input mono">1234567890</div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <div className="form-input">1234 Oak Valley Dr, Suite 200, Austin, TX 78704</div>
              </div>
              <div className="form-group">
                <label>Phone</label>
                <div className="form-input mono">(512) 456-7890</div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'payers' && (
          <Card>
            <h3 className="section-title">{role === 'it_admin' ? 'Payer Adapter Configuration' : 'Payer Credentials'}</h3>
            <div className="payer-list">
              {payers.map(payer => (
                <div key={payer.name} className="settings-row">
                  <div className="payer-info">
                    <span className="row-title">{payer.name}</span>
                    <div className="payer-features">
                      {payer.features.length > 0
                        ? payer.features.map(f => <Badge key={f} variant="cyan" size="sm">{f}</Badge>)
                        : <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>No adapters available</span>
                      }
                    </div>
                  </div>
                  <div className="payer-actions">
                    <Badge variant={payer.status === 'active' ? 'green' : 'amber'} size="sm">
                      {payer.status === 'active' ? 'Active' : 'Coming Soon'}
                    </Badge>
                    {role === 'staff_admin' && payer.status === 'active' && (
                      <div className="credential-display">
                        <span className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                          {showCredentials[payer.name] ? 'svc_dental_2026' : '••••••••••'}
                        </span>
                        <button className="btn-icon-xs" onClick={() => setShowCredentials(prev => ({ ...prev, [payer.name]: !prev[payer.name] }))}>
                          {showCredentials[payer.name] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === 'features' && role === 'it_admin' && (
          <Card>
            <h3 className="section-title">Feature Flags</h3>
            {[
              { name: 'Auto EOB Retrieval', desc: 'Automatically retrieve EOBs on schedule', enabled: true },
              { name: 'Batch Recall Reminders', desc: 'Send recall reminders in batch mode', enabled: true },
              { name: 'Claim Status Polling', desc: 'Automatically check claim status updates', enabled: true },
              { name: 'AI Denial Analysis', desc: 'Use AI to suggest actions for denied claims', enabled: false },
              { name: 'Patient Portal Sync', desc: 'Sync data with patient portal', enabled: false },
            ].map(flag => (
              <div key={flag.name} className="settings-row">
                <div>
                  <span className="row-title">{flag.name}</span>
                  <span className="row-sub">{flag.desc}</span>
                </div>
                <div className="toggle-display" style={{ color: flag.enabled ? 'var(--green)' : 'var(--text-muted)' }}>
                  {flag.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </div>
              </div>
            ))}
          </Card>
        )}

        {activeTab === 'notifications' && role === 'staff_admin' && (
          <Card>
            <h3 className="section-title">Notification Preferences</h3>
            {[
              { name: 'Job Failures', desc: 'Get notified when automation jobs fail', enabled: true },
              { name: 'Claim Denials', desc: 'Alert on new claim denials', enabled: true },
              { name: 'Agent Disconnections', desc: 'Alert when local agent goes offline', enabled: true },
              { name: 'Daily Summary', desc: 'Receive daily automation summary', enabled: false },
            ].map(pref => (
              <div key={pref.name} className="settings-row">
                <div>
                  <span className="row-title">{pref.name}</span>
                  <span className="row-sub">{pref.desc}</span>
                </div>
                <div className="toggle-display" style={{ color: pref.enabled ? 'var(--green)' : 'var(--text-muted)' }}>
                  {pref.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </div>
              </div>
            ))}
          </Card>
        )}

        {activeTab === 'users' && (
          <Card>
            <h3 className="section-title">{role === 'it_admin' ? 'All Users' : 'Staff Users'}</h3>
            <div className="user-list">
              {staffUsers.map(user => (
                <div key={user.email} className="settings-row">
                  <div className="user-row-info">
                    <Avatar initials={user.initials} size={32} />
                    <div>
                      <span className="row-title">{user.name}</span>
                      <span className="row-sub">{user.email}</span>
                    </div>
                  </div>
                  <Badge variant={user.role === 'Staff Admin' ? 'cyan' : 'default'} size="sm">{user.role}</Badge>
                </div>
              ))}
            </div>
            <button className="btn-accent" style={{ marginTop: 'var(--space-md)' }}>+ Invite User</button>
          </Card>
        )}

        {activeTab === 'audit' && role === 'staff_admin' && (
          <Card padding="0">
            <div style={{ padding: 'var(--space-lg) var(--space-lg) 0' }}>
              <h3 className="section-title" style={{ marginBottom: 0 }}>Audit Log</h3>
            </div>
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((entry, i) => (
                  <tr key={i}>
                    <td className="mono">{entry.time}</td>
                    <td>{entry.user}</td>
                    <td>{entry.action}</td>
                    <td style={{ color: 'var(--text-tertiary)' }}>{entry.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <style jsx>{`
        .settings-page {
          max-width: 900px;
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
        .settings-tabs {
          display: flex;
          gap: 2px;
          margin-bottom: var(--space-lg);
          overflow-x: auto;
        }
        .settings-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .section-title {
          font-size: var(--text-md);
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--space-md);
        }
        .settings-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md) 0;
          border-bottom: 1px solid var(--border);
        }
        .settings-row:last-child {
          border-bottom: none;
        }
        .row-title {
          display: block;
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-primary);
        }
        .row-sub {
          display: block;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          margin-top: 2px;
        }
        .payer-info {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        .payer-features {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .payer-actions {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }
        .credential-display {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }
        .btn-icon-xs {
          display: flex;
          align-items: center;
          color: var(--text-tertiary);
          padding: 2px;
          transition: color var(--transition-fast);
        }
        .btn-icon-xs:hover {
          color: var(--text-primary);
        }
        .toggle-display {
          cursor: pointer;
          transition: color var(--transition-fast);
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-md);
        }
        .form-group label {
          display: block;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-bottom: 4px;
        }
        .form-input {
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: var(--text-sm);
          color: var(--text-primary);
        }
        .user-row-info {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        .btn-accent {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--accent-dim);
          border: 1px solid rgba(34, 211, 238, 0.2);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--accent-text);
          transition: all var(--transition-fast);
        }
        .btn-accent:hover {
          background: rgba(34, 211, 238, 0.2);
        }
        .btn-ghost-sm {
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
        .audit-table {
          width: 100%;
          border-collapse: collapse;
        }
        .audit-table th {
          text-align: left;
          padding: var(--space-md);
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--border);
        }
        .audit-table td {
          padding: var(--space-md);
          font-size: var(--text-sm);
          border-bottom: 1px solid var(--border);
        }
        .audit-table tr:last-child td {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
}
