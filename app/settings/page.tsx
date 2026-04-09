'use client';

import { useState, useCallback } from 'react';
import { Settings, Building2, Shield, Users, Bell, Key, ToggleLeft, ToggleRight, FileText, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { NavPill } from '@/components/ui/NavPill';
import { Avatar } from '@/components/ui/Avatar';
import { Toast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
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

const managedClinics = [
  { name: 'Bright Smiles Dental', address: '1234 Oak Valley Dr, Suite 200, Austin, TX 78704', phone: '(512) 456-7890', npi: '1234567890', agentAutoUpdate: true, maxConcurrentJobs: 5, apiTimeout: 30000 },
  { name: 'Lakewood Family Dentistry', address: '567 Lakewood Blvd, Dallas, TX 75214', phone: '(214) 555-1234', npi: '9876543210', agentAutoUpdate: true, maxConcurrentJobs: 3, apiTimeout: 25000 },
  { name: 'North Star Dental Group', address: '890 North Star Way, Houston, TX 77001', phone: '(713) 555-9876', npi: '5678901234', agentAutoUpdate: false, maxConcurrentJobs: 4, apiTimeout: 30000 },
];

interface ClinicProfileData {
  clinicName: string;
  npi: string;
  address: string;
  phone: string;
}

interface InviteUserData {
  fullName: string;
  email: string;
  role: string;
  clinic: string;
}

interface AddClinicData {
  clinicName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  npi: string;
}

interface ConfigureClinicData {
  clinicName: string;
  address: string;
  phone: string;
  npi: string;
  agentAutoUpdate: boolean;
  maxConcurrentJobs: number;
  apiTimeout: number;
}

interface PayerConfigData {
  portalUrl: string;
  connectionTimeout: number;
  maxRetries: number;
  enabledFeatures: { eligibility: boolean; claims: boolean; eob: boolean };
}

const initialFeatureFlags = [
  { name: 'Auto EOB Retrieval', desc: 'Automatically retrieve EOBs on schedule', enabled: true },
  { name: 'Batch Recall Reminders', desc: 'Send recall reminders in batch mode', enabled: true },
  { name: 'Claim Status Polling', desc: 'Automatically check claim status updates', enabled: true },
  { name: 'AI Denial Analysis', desc: 'Use AI to suggest actions for denied claims', enabled: false },
  { name: 'Patient Portal Sync', desc: 'Sync data with patient portal', enabled: false },
];

const initialNotificationPrefs = [
  { name: 'Job Failures', desc: 'Get notified when automation jobs fail', enabled: true },
  { name: 'Claim Denials', desc: 'Alert on new claim denials', enabled: true },
  { name: 'Agent Disconnections', desc: 'Alert when local agent goes offline', enabled: true },
  { name: 'Daily Summary', desc: 'Receive daily automation summary', enabled: false },
];

export default function SettingsPage() {
  const { role } = useRole();
  const [activeTab, setActiveTab] = useState(role === 'it_admin' ? 'clinics' : 'profile');
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', variant: 'success' as 'success' | 'error' });
  const showToast = useCallback((message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, variant });
  }, []);

  // SA16: Clinic Profile form state
  const initialProfileData: ClinicProfileData = {
    clinicName: 'Bright Smiles Dental',
    npi: '1234567890',
    address: '1234 Oak Valley Dr, Suite 200, Austin, TX 78704',
    phone: '(512) 456-7890',
  };
  const [profileData, setProfileData] = useState<ClinicProfileData>(initialProfileData);
  const [savedProfileData, setSavedProfileData] = useState<ClinicProfileData>(initialProfileData);
  const profileDirty = JSON.stringify(profileData) !== JSON.stringify(savedProfileData);

  // Feature flags state (toggleable)
  const [featureFlags, setFeatureFlags] = useState(initialFeatureFlags);

  // Notification prefs state (toggleable)
  const [notificationPrefs, setNotificationPrefs] = useState(initialNotificationPrefs);

  // SA17 / IT10: Invite User modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState<InviteUserData>({ fullName: '', email: '', role: '', clinic: '' });
  const [inviteError, setInviteError] = useState('');

  // IT7: Configure Clinic modal
  const [configureClinic, setConfigureClinic] = useState<ConfigureClinicData | null>(null);

  // IT8: Add Clinic modal
  const [showAddClinicModal, setShowAddClinicModal] = useState(false);
  const [addClinicData, setAddClinicData] = useState<AddClinicData>({ clinicName: '', address: '', city: '', state: '', zip: '', phone: '', npi: '' });
  const [addClinicError, setAddClinicError] = useState('');

  // IT9: Payer Adapter Configure modal
  const [payerConfigName, setPayerConfigName] = useState<string | null>(null);
  const [payerConfigData, setPayerConfigData] = useState<PayerConfigData>({
    portalUrl: '',
    connectionTimeout: 30000,
    maxRetries: 3,
    enabledFeatures: { eligibility: true, claims: true, eob: true },
  });

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

  // Handlers
  const handleProfileSave = () => {
    setSavedProfileData({ ...profileData });
    showToast('Clinic profile saved successfully');
  };

  const handleInviteSubmit = () => {
    if (!inviteData.fullName || !inviteData.email || !inviteData.role || !inviteData.clinic) {
      setInviteError('Please fill in all fields');
      return;
    }
    showToast(`Successfully created ${inviteData.fullName}'s account`);
    setShowInviteModal(false);
    setInviteData({ fullName: '', email: '', role: '', clinic: '' });
    setInviteError('');
  };

  const handleConfigureClinicSave = () => {
    showToast(`${configureClinic?.clinicName} configuration saved`);
    setConfigureClinic(null);
  };

  const handleAddClinicSubmit = () => {
    const { clinicName, address, city, state, zip, phone, npi } = addClinicData;
    if (!clinicName || !address || !city || !state || !zip || !phone || !npi) {
      setAddClinicError('Please fill in all fields');
      return;
    }
    showToast(`${clinicName} added successfully`);
    setShowAddClinicModal(false);
    setAddClinicData({ clinicName: '', address: '', city: '', state: '', zip: '', phone: '', npi: '' });
    setAddClinicError('');
  };

  const handlePayerConfigSave = () => {
    showToast(`${payerConfigName} adapter configured successfully`);
    setPayerConfigName(null);
  };

  const toggleFeatureFlag = (index: number) => {
    setFeatureFlags(prev => prev.map((f, i) => i === index ? { ...f, enabled: !f.enabled } : f));
  };

  const toggleNotificationPref = (index: number) => {
    setNotificationPrefs(prev => prev.map((p, i) => i === index ? { ...p, enabled: !p.enabled } : p));
  };

  const openPayerConfig = (payerName: string) => {
    const payer = payers.find(p => p.name === payerName);
    setPayerConfigName(payerName);
    setPayerConfigData({
      portalUrl: `https://portal.${payerName.toLowerCase().replace(/\s/g, '')}.com`,
      connectionTimeout: 30000,
      maxRetries: 3,
      enabledFeatures: {
        eligibility: payer?.features.includes('Eligibility') ?? false,
        claims: payer?.features.includes('Claims') ?? false,
        eob: payer?.features.includes('EOB') ?? false,
      },
    });
  };

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
        {/* IT Admin: Clinics Tab */}
        {activeTab === 'clinics' && role === 'it_admin' && (
          <Card>
            <h3 className="section-title">Managed Clinics</h3>
            <div className="clinic-list">
              {managedClinics.map(clinic => (
                <div key={clinic.name} className="settings-row">
                  <div>
                    <span className="row-title">{clinic.name}</span>
                    <span className="row-sub">Active — Agent deployed</span>
                  </div>
                  <button
                    className="btn-ghost-sm"
                    onClick={() => setConfigureClinic({
                      clinicName: clinic.name,
                      address: clinic.address,
                      phone: clinic.phone,
                      npi: clinic.npi,
                      agentAutoUpdate: clinic.agentAutoUpdate,
                      maxConcurrentJobs: clinic.maxConcurrentJobs,
                      apiTimeout: clinic.apiTimeout,
                    })}
                  >
                    Configure
                  </button>
                </div>
              ))}
            </div>
            <button className="btn-accent" style={{ marginTop: 'var(--space-md)' }} onClick={() => setShowAddClinicModal(true)}>+ Add Clinic</button>
          </Card>
        )}

        {/* Staff Admin: Clinic Profile Tab */}
        {activeTab === 'profile' && role === 'staff_admin' && (
          <Card>
            <h3 className="section-title">Clinic Profile</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Clinic Name</label>
                <input
                  className="form-input"
                  type="text"
                  value={profileData.clinicName}
                  onChange={e => setProfileData(prev => ({ ...prev, clinicName: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>NPI</label>
                <input
                  className="form-input mono"
                  type="text"
                  value={profileData.npi}
                  onChange={e => setProfileData(prev => ({ ...prev, npi: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Address</label>
                <input
                  className="form-input"
                  type="text"
                  value={profileData.address}
                  onChange={e => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  className="form-input mono"
                  type="text"
                  value={profileData.phone}
                  onChange={e => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
            {profileDirty && (
              <div style={{ marginTop: 'var(--space-lg)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-accent" onClick={handleProfileSave}>Save Changes</button>
              </div>
            )}
          </Card>
        )}

        {/* Payers Tab */}
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
                    {role === 'it_admin' && payer.status === 'active' && (
                      <button className="btn-ghost-sm" onClick={() => openPayerConfig(payer.name)}>Configure</button>
                    )}
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

        {/* IT Admin: Feature Flags Tab */}
        {activeTab === 'features' && role === 'it_admin' && (
          <Card>
            <h3 className="section-title">Feature Flags</h3>
            {featureFlags.map((flag, index) => (
              <div key={flag.name} className="settings-row">
                <div>
                  <span className="row-title">{flag.name}</span>
                  <span className="row-sub">{flag.desc}</span>
                </div>
                <button
                  className="toggle-btn"
                  style={{ color: flag.enabled ? 'var(--green)' : 'var(--text-muted)' }}
                  onClick={() => toggleFeatureFlag(index)}
                  aria-label={`Toggle ${flag.name}`}
                >
                  {flag.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>
            ))}
          </Card>
        )}

        {/* Staff Admin: Notifications Tab */}
        {activeTab === 'notifications' && role === 'staff_admin' && (
          <Card>
            <h3 className="section-title">Notification Preferences</h3>
            {notificationPrefs.map((pref, index) => (
              <div key={pref.name} className="settings-row">
                <div>
                  <span className="row-title">{pref.name}</span>
                  <span className="row-sub">{pref.desc}</span>
                </div>
                <button
                  className="toggle-btn"
                  style={{ color: pref.enabled ? 'var(--green)' : 'var(--text-muted)' }}
                  onClick={() => toggleNotificationPref(index)}
                  aria-label={`Toggle ${pref.name}`}
                >
                  {pref.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>
            ))}
          </Card>
        )}

        {/* Users Tab */}
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
            <button className="btn-accent" style={{ marginTop: 'var(--space-md)' }} onClick={() => { setShowInviteModal(true); setInviteError(''); }}>+ Invite User</button>
          </Card>
        )}

        {/* Staff Admin: Audit Log Tab */}
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

      {/* SA17 / IT10: Invite User Modal */}
      <Modal open={showInviteModal} onClose={() => { setShowInviteModal(false); setInviteError(''); }} title="Invite User">
        <div className="modal-form">
          {inviteError && (
            <div className="error-banner">{inviteError}</div>
          )}
          <div className="modal-form-group">
            <label>Full Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="Enter full name"
              value={inviteData.fullName}
              onChange={e => setInviteData(prev => ({ ...prev, fullName: e.target.value }))}
            />
          </div>
          <div className="modal-form-group">
            <label>Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="Enter email address"
              value={inviteData.email}
              onChange={e => setInviteData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="modal-form-group">
            <label>Role</label>
            <select
              className="form-input"
              value={inviteData.role}
              onChange={e => setInviteData(prev => ({ ...prev, role: e.target.value }))}
            >
              <option value="">Select role...</option>
              <option value="Staff Admin">Staff Admin</option>
              <option value="Staff User">Staff User</option>
            </select>
          </div>
          <div className="modal-form-group">
            <label>Clinic</label>
            <select
              className="form-input"
              value={inviteData.clinic}
              onChange={e => setInviteData(prev => ({ ...prev, clinic: e.target.value }))}
            >
              <option value="">Select clinic...</option>
              <option value="Bright Smiles">Bright Smiles</option>
              <option value="Lakewood">Lakewood</option>
              <option value="North Star">North Star</option>
            </select>
          </div>
          <div className="modal-actions">
            <button className="btn-ghost-sm" onClick={() => { setShowInviteModal(false); setInviteError(''); }}>Cancel</button>
            <button className="btn-accent" onClick={handleInviteSubmit}>Send Invite</button>
          </div>
        </div>
      </Modal>

      {/* IT7: Configure Clinic Modal */}
      <Modal open={configureClinic !== null} onClose={() => setConfigureClinic(null)} title={`Configure — ${configureClinic?.clinicName ?? ''}`}>
        {configureClinic && (
          <div className="modal-form">
            <div className="modal-form-group">
              <label>Clinic Name</label>
              <input
                className="form-input"
                type="text"
                value={configureClinic.clinicName}
                onChange={e => setConfigureClinic(prev => prev ? { ...prev, clinicName: e.target.value } : prev)}
              />
            </div>
            <div className="modal-form-group">
              <label>Address</label>
              <input
                className="form-input"
                type="text"
                value={configureClinic.address}
                onChange={e => setConfigureClinic(prev => prev ? { ...prev, address: e.target.value } : prev)}
              />
            </div>
            <div className="modal-form-row">
              <div className="modal-form-group">
                <label>Phone</label>
                <input
                  className="form-input"
                  type="text"
                  value={configureClinic.phone}
                  onChange={e => setConfigureClinic(prev => prev ? { ...prev, phone: e.target.value } : prev)}
                />
              </div>
              <div className="modal-form-group">
                <label>NPI</label>
                <input
                  className="form-input mono"
                  type="text"
                  value={configureClinic.npi}
                  onChange={e => setConfigureClinic(prev => prev ? { ...prev, npi: e.target.value } : prev)}
                />
              </div>
            </div>
            <div className="settings-row" style={{ paddingTop: 'var(--space-sm)' }}>
              <div>
                <span className="row-title">Agent Auto-Update</span>
                <span className="row-sub">Automatically update agent to latest version</span>
              </div>
              <button
                className="toggle-btn"
                style={{ color: configureClinic.agentAutoUpdate ? 'var(--green)' : 'var(--text-muted)' }}
                onClick={() => setConfigureClinic(prev => prev ? { ...prev, agentAutoUpdate: !prev.agentAutoUpdate } : prev)}
              >
                {configureClinic.agentAutoUpdate ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>
            <div className="modal-form-row">
              <div className="modal-form-group">
                <label>Max Concurrent Jobs</label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  value={configureClinic.maxConcurrentJobs}
                  onChange={e => setConfigureClinic(prev => prev ? { ...prev, maxConcurrentJobs: parseInt(e.target.value) || 1 } : prev)}
                />
              </div>
              <div className="modal-form-group">
                <label>API Timeout</label>
                <div className="input-suffix-wrap">
                  <input
                    className="form-input"
                    type="number"
                    min={1000}
                    step={1000}
                    value={configureClinic.apiTimeout}
                    onChange={e => setConfigureClinic(prev => prev ? { ...prev, apiTimeout: parseInt(e.target.value) || 1000 } : prev)}
                  />
                  <span className="input-suffix">ms</span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost-sm" onClick={() => setConfigureClinic(null)}>Cancel</button>
              <button className="btn-accent" onClick={handleConfigureClinicSave}>Save Configuration</button>
            </div>
          </div>
        )}
      </Modal>

      {/* IT8: Add Clinic Modal */}
      <Modal open={showAddClinicModal} onClose={() => { setShowAddClinicModal(false); setAddClinicError(''); }} title="Add New Clinic">
        <div className="modal-form">
          {addClinicError && (
            <div className="error-banner">{addClinicError}</div>
          )}
          <div className="modal-form-group">
            <label>Clinic Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="Enter clinic name"
              value={addClinicData.clinicName}
              onChange={e => setAddClinicData(prev => ({ ...prev, clinicName: e.target.value }))}
            />
          </div>
          <div className="modal-form-group">
            <label>Address</label>
            <input
              className="form-input"
              type="text"
              placeholder="Street address"
              value={addClinicData.address}
              onChange={e => setAddClinicData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>
          <div className="modal-form-row triple">
            <div className="modal-form-group">
              <label>City</label>
              <input
                className="form-input"
                type="text"
                placeholder="City"
                value={addClinicData.city}
                onChange={e => setAddClinicData(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div className="modal-form-group">
              <label>State</label>
              <input
                className="form-input"
                type="text"
                placeholder="TX"
                maxLength={2}
                value={addClinicData.state}
                onChange={e => setAddClinicData(prev => ({ ...prev, state: e.target.value }))}
              />
            </div>
            <div className="modal-form-group">
              <label>ZIP</label>
              <input
                className="form-input"
                type="text"
                placeholder="78704"
                maxLength={5}
                value={addClinicData.zip}
                onChange={e => setAddClinicData(prev => ({ ...prev, zip: e.target.value }))}
              />
            </div>
          </div>
          <div className="modal-form-row">
            <div className="modal-form-group">
              <label>Phone</label>
              <input
                className="form-input"
                type="text"
                placeholder="(512) 456-7890"
                value={addClinicData.phone}
                onChange={e => setAddClinicData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="modal-form-group">
              <label>NPI</label>
              <input
                className="form-input mono"
                type="text"
                placeholder="1234567890"
                maxLength={10}
                value={addClinicData.npi}
                onChange={e => setAddClinicData(prev => ({ ...prev, npi: e.target.value }))}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-ghost-sm" onClick={() => { setShowAddClinicModal(false); setAddClinicError(''); }}>Cancel</button>
            <button className="btn-accent" onClick={handleAddClinicSubmit}>Add Clinic</button>
          </div>
        </div>
      </Modal>

      {/* IT9: Payer Adapter Configure Modal */}
      <Modal open={payerConfigName !== null} onClose={() => setPayerConfigName(null)} title={`Configure — ${payerConfigName ?? ''}`}>
        <div className="modal-form">
          <div className="modal-form-group">
            <label>Portal URL</label>
            <input
              className="form-input"
              type="text"
              value={payerConfigData.portalUrl}
              onChange={e => setPayerConfigData(prev => ({ ...prev, portalUrl: e.target.value }))}
            />
          </div>
          <div className="modal-form-row">
            <div className="modal-form-group">
              <label>Connection Timeout</label>
              <div className="input-suffix-wrap">
                <input
                  className="form-input"
                  type="number"
                  min={1000}
                  step={1000}
                  value={payerConfigData.connectionTimeout}
                  onChange={e => setPayerConfigData(prev => ({ ...prev, connectionTimeout: parseInt(e.target.value) || 1000 }))}
                />
                <span className="input-suffix">ms</span>
              </div>
            </div>
            <div className="modal-form-group">
              <label>Max Retries</label>
              <input
                className="form-input"
                type="number"
                min={0}
                max={10}
                value={payerConfigData.maxRetries}
                onChange={e => setPayerConfigData(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="modal-form-group">
            <label>Enabled Features</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={payerConfigData.enabledFeatures.eligibility}
                  onChange={e => setPayerConfigData(prev => ({ ...prev, enabledFeatures: { ...prev.enabledFeatures, eligibility: e.target.checked } }))}
                />
                <span>Eligibility</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={payerConfigData.enabledFeatures.claims}
                  onChange={e => setPayerConfigData(prev => ({ ...prev, enabledFeatures: { ...prev.enabledFeatures, claims: e.target.checked } }))}
                />
                <span>Claims</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={payerConfigData.enabledFeatures.eob}
                  onChange={e => setPayerConfigData(prev => ({ ...prev, enabledFeatures: { ...prev.enabledFeatures, eob: e.target.checked } }))}
                />
                <span>EOB</span>
              </label>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-ghost-sm" onClick={() => setPayerConfigName(null)}>Cancel</button>
            <button className="btn-accent" onClick={handlePayerConfigSave}>Save Configuration</button>
          </div>
        </div>
      </Modal>

      {/* Global Toast */}
      <Toast
        message={toast.message}
        variant={toast.variant}
        visible={toast.visible}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />

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
        .toggle-btn {
          display: flex;
          align-items: center;
          cursor: pointer;
          padding: 4px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
          background: transparent;
          border: none;
        }
        .toggle-btn:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-md);
        }
        .form-group label,
        .modal-form-group label {
          display: block;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-bottom: 4px;
        }
        .form-input {
          width: 100%;
          padding: 10px var(--space-md);
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          color: var(--text-primary);
          transition: border-color var(--transition-fast);
          outline: none;
          box-sizing: border-box;
        }
        .form-input:focus {
          border-color: var(--accent);
        }
        .form-input::placeholder {
          color: var(--text-muted, var(--text-tertiary));
          opacity: 0.6;
        }
        select.form-input {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 32px;
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
          cursor: pointer;
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
          cursor: pointer;
          background: transparent;
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

        /* Modal form styles */
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .modal-form-group {
          display: flex;
          flex-direction: column;
        }
        .modal-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-md);
        }
        .modal-form-row.triple {
          grid-template-columns: 2fr 1fr 1fr;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-sm);
          margin-top: var(--space-sm);
          padding-top: var(--space-md);
          border-top: 1px solid var(--border);
        }
        .error-banner {
          padding: 10px var(--space-md);
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.3);
          border-radius: var(--radius-md);
          color: rgb(248, 113, 113);
          font-size: var(--text-sm);
          font-weight: 500;
        }
        .input-suffix-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-suffix-wrap .form-input {
          padding-right: 40px;
        }
        .input-suffix {
          position: absolute;
          right: 12px;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          pointer-events: none;
          font-weight: 500;
        }
        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          margin-top: 4px;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: var(--text-sm) !important;
          color: var(--text-primary) !important;
          text-transform: none !important;
          letter-spacing: 0 !important;
          font-weight: 400 !important;
          cursor: pointer;
        }
        .checkbox-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: var(--accent);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
