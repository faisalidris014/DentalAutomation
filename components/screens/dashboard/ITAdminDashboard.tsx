'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { ITAdminKPIs } from '@/types/api';
import {
  Building2,
  BriefcaseBusiness,
  TrendingUp,
  Bot,
  AlertTriangle,
  ServerCrash,
  FileWarning,
  Clock,
  ShieldAlert,
  XCircle,
  Plus,
  ArrowUpCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { KPICard } from '@/components/ui/KPICard';
import { Card } from '@/components/ui/Card';
import { StatusDot } from '@/components/ui/StatusDot';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { formatRelativeTime } from '@/lib/formatters';

const clinics = [
  {
    name: 'Bright Smiles Dental',
    agentStatus: 'online' as const,
    lastHeartbeat: new Date(Date.now() - 30000).toISOString(),
    jobsInQueue: 4,
    jobsCompleted: 28,
  },
  {
    name: 'North Star Dental',
    agentStatus: 'offline' as const,
    lastHeartbeat: new Date(Date.now() - 3600000 * 2).toISOString(),
    jobsInQueue: 12,
    jobsCompleted: 18,
  },
  {
    name: 'Summit Oral Surgery',
    agentStatus: 'online' as const,
    lastHeartbeat: new Date(Date.now() - 15000).toISOString(),
    jobsInQueue: 2,
    jobsCompleted: 27,
  },
];

const alerts = [
  {
    id: 1,
    icon: <ServerCrash size={16} />,
    message: 'Agent offline: North Star Dental',
    time: new Date(Date.now() - 3600000 * 2).toISOString(),
    severity: 'red' as const,
  },
  {
    id: 2,
    icon: <FileWarning size={16} />,
    message: 'Failed job: EOB retrieval timeout',
    time: new Date(Date.now() - 3600000).toISOString(),
    severity: 'red' as const,
  },
  {
    id: 3,
    icon: <ShieldAlert size={16} />,
    message: 'SSL certificate expires in 14 days',
    time: new Date(Date.now() - 3600000 * 4).toISOString(),
    severity: 'amber' as const,
  },
  {
    id: 4,
    icon: <XCircle size={16} />,
    message: 'Claim submission rejected: invalid NPI',
    time: new Date(Date.now() - 3600000 * 5).toISOString(),
    severity: 'amber' as const,
  },
  {
    id: 5,
    icon: <AlertTriangle size={16} />,
    message: 'High queue depth at Bright Smiles Dental',
    time: new Date(Date.now() - 3600000 * 6).toISOString(),
    severity: 'amber' as const,
  },
];

const statusVariantMap: Record<string, 'green' | 'red' | 'amber'> = {
  online: 'green',
  offline: 'red',
  degraded: 'amber',
};

const alertDescriptions: Record<string, { description: string; affectedClinic: string; recommendedAction: string }> = {
  'Agent offline: North Star Dental': {
    description: 'The DentalFlow agent at North Star Dental has stopped sending heartbeat signals and is no longer processing jobs. The last successful heartbeat was received over 2 hours ago.',
    affectedClinic: 'North Star Dental',
    recommendedAction: 'SSH into the North Star agent server and restart the DentalFlow service. Check system logs for crash reports or out-of-memory errors.',
  },
  'Failed job: EOB retrieval timeout': {
    description: 'An EOB retrieval job timed out after 60 seconds waiting for the payer portal to respond. The job has been moved to the failed queue and will not be retried automatically.',
    affectedClinic: 'Bright Smiles Dental',
    recommendedAction: 'Check payer portal availability. If the portal is responsive, retry the job manually. Consider increasing timeout thresholds if this is recurring.',
  },
  'SSL certificate expires in 14 days': {
    description: 'The SSL certificate for the agent communication endpoint will expire in 14 days. After expiration, agents will be unable to establish secure connections to the central server.',
    affectedClinic: 'All Clinics',
    recommendedAction: 'Renew the SSL certificate immediately. If using Let\'s Encrypt, check that the auto-renewal cron job is running. Deploy the new certificate before expiry.',
  },
  'Claim submission rejected: invalid NPI': {
    description: 'A claim submission was rejected by the clearinghouse due to an invalid or mismatched NPI number. The claim was for patient records processed through the automated pipeline.',
    affectedClinic: 'Lakewood Family Dentistry',
    recommendedAction: 'Verify the NPI number in the clinic configuration. Cross-reference with the NPPES registry. Update the NPI and resubmit the rejected claim.',
  },
  'High queue depth at Bright Smiles Dental': {
    description: 'The job queue at Bright Smiles Dental has grown beyond the normal threshold. There are currently 4 jobs waiting to be processed, which may indicate a slowdown in processing speed.',
    affectedClinic: 'Bright Smiles Dental',
    recommendedAction: 'Monitor queue depth over the next hour. If it continues to grow, check agent CPU/memory usage. Consider temporarily scaling up processing capacity.',
  },
};

type AlertItem = typeof alerts[0];

const agentVersions = [
  { name: 'Bright Smiles Dental', currentVersion: 'v2.4.1', latestVersion: 'v2.4.1' },
  { name: 'Lakewood Family Dentistry', currentVersion: 'v2.3.8', latestVersion: 'v2.4.1' },
  { name: 'North Star Dental', currentVersion: 'v2.4.0', latestVersion: 'v2.4.1' },
];

const emptyAddClinicForm = { clinicName: '', address: '', city: '', state: '', zip: '', phone: '', npi: '' };

export function ITAdminDashboard() {
  const [kpis, setKpis] = useState<ITAdminKPIs | null>(null);

  useEffect(() => {
    api.get<{ data: ITAdminKPIs }>('/api/dashboard/kpis')
      .then(res => setKpis(res.data))
      .catch(() => {});
  }, []);

  const [selectedClinic, setSelectedClinic] = useState<typeof clinics[0] | null>(null);
  const [showAddClinic, setShowAddClinic] = useState(false);
  const [showPushUpdate, setShowPushUpdate] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

  const [addClinicForm, setAddClinicForm] = useState(emptyAddClinicForm);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const [updatedAgents, setUpdatedAgents] = useState<Record<string, boolean>>({});
  const [updatingAgents, setUpdatingAgents] = useState<Record<string, boolean>>({});

  function handleAddClinicSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { clinicName, address, city, state, zip, phone, npi } = addClinicForm;
    if (!clinicName || !address || !city || !state || !zip || !phone || !npi) return;
    setShowAddClinic(false);
    setAddClinicForm(emptyAddClinicForm);
    setToastMessage('Clinic added successfully');
    setToastVisible(true);
  }

  function handlePushUpdate(agentName: string) {
    setUpdatingAgents(prev => ({ ...prev, [agentName]: true }));
    setTimeout(() => {
      setUpdatingAgents(prev => ({ ...prev, [agentName]: false }));
      setUpdatedAgents(prev => ({ ...prev, [agentName]: true }));
    }, 1500);
  }

  return (
    <div className="it-admin-dashboard">
      <div className="section-title">System Overview</div>

      <div className="kpi-grid">
        <div style={{ animationDelay: '0ms' }} className="kpi-animate">
          <KPICard
            label="Total Clinics"
            value={kpis?.totalClinics ?? '—'}
            icon={<Building2 size={20} />}
            accentColor="var(--accent)"
          />
        </div>
        <div style={{ animationDelay: '60ms' }} className="kpi-animate">
          <KPICard
            label="Jobs Today"
            value={kpis?.jobsToday ?? '—'}
            icon={<BriefcaseBusiness size={20} />}
            accentColor="var(--purple)"
          />
        </div>
        <div style={{ animationDelay: '120ms' }} className="kpi-animate">
          <KPICard
            label="Total Patients"
            value={kpis?.totalPatients ?? '—'}
            icon={<TrendingUp size={20} />}
            accentColor="var(--green)"
          />
        </div>
        <div style={{ animationDelay: '180ms' }} className="kpi-animate">
          <KPICard
            label="Failed Jobs Today"
            value={kpis?.failedJobsToday ?? '—'}
            icon={<Bot size={20} />}
            accentColor={kpis && kpis.failedJobsToday > 0 ? 'var(--red)' : 'var(--green)'}
          />
        </div>
      </div>

      <div className="section-title">Clinic Health</div>

      <div className="clinic-grid">
        {clinics.map((clinic, i) => (
          <div
            key={clinic.name}
            className="kpi-animate"
            style={{ animationDelay: `${i * 60}ms`, cursor: 'pointer' }}
            onClick={() => setSelectedClinic(clinic)}
          >
            <Card hoverable>
              <div className="clinic-card__header">
                <span className="clinic-card__name">{clinic.name}</span>
                <StatusDot
                  variant={statusVariantMap[clinic.agentStatus]}
                  label={clinic.agentStatus}
                />
              </div>
              <div className="clinic-card__meta">
                <div className="clinic-card__row">
                  <Clock size={14} />
                  <span>Last heartbeat: {formatRelativeTime(clinic.lastHeartbeat)}</span>
                </div>
                <div className="clinic-card__stats">
                  <Badge variant="cyan">{clinic.jobsInQueue} queued</Badge>
                  <Badge variant="green">{clinic.jobsCompleted} completed</Badge>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>

      <div className="bottom-grid">
        <div>
          <div className="section-title">Recent System Alerts</div>
          <Card>
            <div className="alerts-list">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="alert-item alert-item--clickable"
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div className="alert-item__icon" data-severity={alert.severity}>
                    {alert.icon}
                  </div>
                  <div className="alert-item__content">
                    <span className="alert-item__message">{alert.message}</span>
                    <span className="alert-item__time">{formatRelativeTime(alert.time)}</span>
                  </div>
                  <Badge variant={alert.severity} size="sm">
                    {alert.severity === 'red' ? 'Critical' : 'Warning'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <div className="section-title">Quick Actions</div>
          <div className="actions-grid">
            <button className="action-btn" onClick={() => setShowAddClinic(true)}>
              <Plus size={18} />
              <span>Add Clinic</span>
            </button>
            <button className="action-btn action-btn--secondary" onClick={() => setShowPushUpdate(true)}>
              <ArrowUpCircle size={18} />
              <span>Push Agent Update</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clinic Detail Modal */}
      <Modal open={!!selectedClinic} onClose={() => setSelectedClinic(null)} title={selectedClinic?.name ?? ''}>
        {selectedClinic && (
          <div className="detail-grid">
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className="detail-value">
                <StatusDot variant={statusVariantMap[selectedClinic.agentStatus]} label={selectedClinic.agentStatus} />
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Last Heartbeat</span>
              <span className="detail-value">{formatRelativeTime(selectedClinic.lastHeartbeat)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Jobs Queued</span>
              <span className="detail-value">{selectedClinic.jobsInQueue}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Jobs Completed</span>
              <span className="detail-value">{selectedClinic.jobsCompleted}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Agent Version</span>
              <span className="detail-value">v2.4.1</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Uptime</span>
              <span className="detail-value">14d 6h</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">OpenDental Connection</span>
              <span className="detail-value detail-value--connected">
                <StatusDot variant="green" size={6} />
                <span>Connected</span>
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Clinic Modal */}
      <Modal open={showAddClinic} onClose={() => setShowAddClinic(false)} title="Add New Clinic" width="520px">
        <form onSubmit={handleAddClinicSubmit} className="add-clinic-form">
          <div className="form-group">
            <label className="form-label">Clinic Name *</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. Sunrise Dental"
              value={addClinicForm.clinicName}
              onChange={e => setAddClinicForm(f => ({ ...f, clinicName: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Address *</label>
            <input
              className="form-input"
              type="text"
              placeholder="Street address"
              value={addClinicForm.address}
              onChange={e => setAddClinicForm(f => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">City *</label>
              <input
                className="form-input"
                type="text"
                placeholder="City"
                value={addClinicForm.city}
                onChange={e => setAddClinicForm(f => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">State *</label>
              <select
                className="form-input"
                value={addClinicForm.state}
                onChange={e => setAddClinicForm(f => ({ ...f, state: e.target.value }))}
              >
                <option value="">Select</option>
                <option value="TX">TX</option>
                <option value="CA">CA</option>
                <option value="NY">NY</option>
                <option value="FL">FL</option>
                <option value="IL">IL</option>
                <option value="PA">PA</option>
                <option value="OH">OH</option>
                <option value="GA">GA</option>
                <option value="NC">NC</option>
                <option value="MI">MI</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">ZIP *</label>
              <input
                className="form-input"
                type="text"
                placeholder="ZIP"
                value={addClinicForm.zip}
                onChange={e => setAddClinicForm(f => ({ ...f, zip: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input
                className="form-input"
                type="text"
                placeholder="(512) 555-0000"
                value={addClinicForm.phone}
                onChange={e => setAddClinicForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">NPI *</label>
              <input
                className="form-input"
                type="text"
                placeholder="10-digit NPI"
                value={addClinicForm.npi}
                onChange={e => setAddClinicForm(f => ({ ...f, npi: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="action-btn action-btn--secondary" onClick={() => setShowAddClinic(false)}>
              Cancel
            </button>
            <button type="submit" className="action-btn">
              <Plus size={16} />
              <span>Add Clinic</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Push Agent Update Modal */}
      <Modal open={showPushUpdate} onClose={() => setShowPushUpdate(false)} title="Push Agent Update" width="580px">
        <div className="agent-update-list">
          <div className="agent-update-header">
            <span>Clinic</span>
            <span>Current</span>
            <span>Latest</span>
            <span></span>
          </div>
          {agentVersions.map(agent => {
            const isCurrent = agent.currentVersion === agent.latestVersion;
            const isUpdating = updatingAgents[agent.name];
            const isUpdated = updatedAgents[agent.name];
            return (
              <div key={agent.name} className="agent-update-row">
                <span className="agent-update-name">{agent.name}</span>
                <span className="agent-update-version">
                  <Badge variant={isCurrent ? 'green' : 'amber'} size="sm">{agent.currentVersion}</Badge>
                </span>
                <span className="agent-update-version">
                  <Badge variant="cyan" size="sm">{agent.latestVersion}</Badge>
                </span>
                <span className="agent-update-action">
                  {isUpdating ? (
                    <span className="agent-updating"><Loader2 size={14} className="spin-icon" /> Updating...</span>
                  ) : isUpdated || isCurrent ? (
                    <span className="agent-updated"><CheckCircle2 size={14} /> Updated</span>
                  ) : (
                    <button className="push-btn" onClick={() => handlePushUpdate(agent.name)}>
                      Push Update
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Alert Detail Modal */}
      <Modal open={!!selectedAlert} onClose={() => setSelectedAlert(null)} title={selectedAlert?.message ?? ''} width="560px">
        {selectedAlert && (() => {
          const info = alertDescriptions[selectedAlert.message];
          return (
            <div className="alert-detail">
              <div className="alert-detail__severity">
                <Badge variant={selectedAlert.severity}>
                  {selectedAlert.severity === 'red' ? 'Critical' : 'Warning'}
                </Badge>
                <span className="alert-detail__time">{formatRelativeTime(selectedAlert.time)}</span>
              </div>
              <div className="alert-detail__section">
                <span className="alert-detail__label">Description</span>
                <p className="alert-detail__text">{info?.description ?? 'No additional details available.'}</p>
              </div>
              <div className="alert-detail__section">
                <span className="alert-detail__label">Affected Clinic</span>
                <p className="alert-detail__text">{info?.affectedClinic ?? 'Unknown'}</p>
              </div>
              <div className="alert-detail__section">
                <span className="alert-detail__label">Recommended Action</span>
                <p className="alert-detail__text">{info?.recommendedAction ?? 'Investigate the issue and take corrective action.'}</p>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Toast */}
      <Toast message={toastMessage} visible={toastVisible} onClose={() => setToastVisible(false)} />

      <style jsx>{`
        .it-admin-dashboard {
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
        .clinic-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-lg);
        }
        .clinic-card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-md);
        }
        .clinic-card__name {
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--text-primary);
        }
        .clinic-card__meta {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        .clinic-card__row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .clinic-card__stats {
          display: flex;
          gap: var(--space-sm);
          margin-top: var(--space-xs);
        }
        .bottom-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--space-lg);
          align-items: start;
        }
        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .alert-item {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }
        .alert-item--clickable {
          cursor: pointer;
          border-radius: var(--radius-md);
          padding: var(--space-sm);
          margin: calc(-1 * var(--space-sm));
          margin-bottom: 0;
          transition: background 0.15s ease;
        }
        .alert-item--clickable:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .alert-item__icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .alert-item__icon[data-severity='red'] {
          background: rgba(248, 113, 113, 0.12);
          color: var(--red);
        }
        .alert-item__icon[data-severity='amber'] {
          background: rgba(251, 191, 36, 0.12);
          color: var(--amber);
        }
        .alert-item__content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .alert-item__message {
          font-size: var(--text-sm);
          color: var(--text-primary);
          font-weight: 500;
        }
        .alert-item__time {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .actions-grid {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
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

        /* Clinic Detail Modal */
        .detail-grid {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-size: var(--text-sm);
          color: var(--text-tertiary);
          font-weight: 500;
        }
        .detail-value {
          font-size: var(--text-sm);
          color: var(--text-primary);
          font-weight: 600;
        }
        .detail-value--connected {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--green);
        }

        /* Add Clinic Form */
        .add-clinic-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-label {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .form-input {
          padding: 10px 14px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          background: var(--bg-elevated);
          color: var(--text-primary);
          font-size: var(--text-sm);
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          width: 100%;
          font-family: inherit;
        }
        .form-input::placeholder {
          color: var(--text-muted);
        }
        .form-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.15);
        }
        .form-row-3 {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: var(--space-md);
        }
        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-md);
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-md);
          margin-top: var(--space-sm);
        }

        /* Agent Update Modal */
        .agent-update-list {
          display: flex;
          flex-direction: column;
        }
        .agent-update-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.2fr;
          gap: var(--space-md);
          padding-bottom: var(--space-md);
          border-bottom: 1px solid var(--border);
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .agent-update-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.2fr;
          gap: var(--space-md);
          align-items: center;
          padding: 14px 0;
          border-bottom: 1px solid var(--border);
        }
        .agent-update-row:last-child {
          border-bottom: none;
        }
        .agent-update-name {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
        }
        .agent-update-version {
          display: flex;
          align-items: center;
        }
        .agent-update-action {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        .push-btn {
          padding: 6px 14px;
          border-radius: var(--radius-md);
          font-size: var(--text-xs);
          font-weight: 600;
          cursor: pointer;
          background: var(--accent);
          color: var(--bg-deepest);
          border: none;
          transition: all 0.2s ease;
        }
        .push-btn:hover {
          opacity: 0.9;
          box-shadow: 0 2px 8px rgba(34, 211, 238, 0.3);
        }
        .agent-updating {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          font-weight: 500;
        }
        .agent-updated {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-xs);
          color: var(--green);
          font-weight: 600;
        }

        /* Alert Detail Modal */
        .alert-detail {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }
        .alert-detail__severity {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }
        .alert-detail__time {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .alert-detail__section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .alert-detail__label {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .alert-detail__text {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        /* Spinner */
        .it-admin-dashboard :global(.spin-icon) {
          animation: spin 1s linear infinite;
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
          .clinic-grid {
            grid-template-columns: 1fr;
          }
          .bottom-grid {
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
