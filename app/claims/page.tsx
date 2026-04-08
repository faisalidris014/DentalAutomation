'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { NavPill } from '@/components/ui/NavPill';
import { SearchBar } from '@/components/ui/SearchBar';
import { Modal } from '@/components/ui/Modal';
import { Timeline } from '@/components/ui/Timeline';
import { searchPatients, getClaims, submitClaim } from '@/lib/mockApi';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useRole } from '@/context/RoleContext';
import type { Claim, Patient } from '@/types';

type ClaimsTab = 'submit' | 'track' | 'denied';

const MOCK_PROCEDURES = [
  { code: 'D2391', description: 'Composite 1 Surface', fee: 185.0 },
  { code: 'D0274', description: 'Bitewings 4 Films', fee: 65.0 },
  { code: 'D1110', description: 'Prophylaxis Adult', fee: 95.0 },
  { code: 'D0120', description: 'Periodic Oral Eval', fee: 52.0 },
];

function claimStatusBadgeVariant(status: string): 'green' | 'amber' | 'red' | 'cyan' | 'purple' | 'default' {
  switch (status) {
    case 'paid':
    case 'approved':
      return 'green';
    case 'submitted':
    case 'processing':
      return 'amber';
    case 'denied':
      return 'red';
    case 'partial':
      return 'cyan';
    default:
      return 'default';
  }
}

export default function ClaimsPage() {
  const { currentClinic } = useRole();
  const [activeTab, setActiveTab] = useState<ClaimsTab>('submit');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Submit New state
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedProcedures, setSelectedProcedures] = useState<Set<string>>(new Set());
  const [submitStep, setSubmitStep] = useState(-1); // -1 = not started, 0-2 = steps, 3 = done
  const [submitRef, setSubmitRef] = useState('');

  // Resubmit state
  const [resubmittingId, setResubmittingId] = useState<string | null>(null);
  const [resubmittedIds, setResubmittedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getClaims(currentClinic.id).then(data => {
      setClaims(data);
      setLoadingClaims(false);
    });
  }, [currentClinic.id]);

  // Patient search
  useEffect(() => {
    if (patientQuery.length < 2) {
      setPatientResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchPatients(patientQuery, currentClinic.id).then(setPatientResults);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientQuery, currentClinic.id]);

  const handleSelectPatient = useCallback((id: string) => {
    const patient = patientResults.find(p => p.id === id);
    if (patient) {
      setSelectedPatient(patient);
      setPatientQuery(`${patient.firstName} ${patient.lastName}`);
      setSelectedProcedures(new Set());
      setSubmitStep(-1);
      setSubmitRef('');
    }
  }, [patientResults]);

  const toggleProcedure = useCallback((code: string) => {
    setSelectedProcedures(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const selectedTotal = useMemo(() => {
    return MOCK_PROCEDURES
      .filter(p => selectedProcedures.has(p.code))
      .reduce((sum, p) => sum + p.fee, 0);
  }, [selectedProcedures]);

  const handleSubmitClaim = useCallback(async () => {
    if (selectedProcedures.size === 0 || !selectedPatient) return;
    setSubmitting(true);
    setSubmitStep(0);
    await new Promise(r => setTimeout(r, 1000));
    setSubmitStep(1);
    await new Promise(r => setTimeout(r, 1000));
    setSubmitStep(2);
    const result = await submitClaim();
    setSubmitRef(result.referenceNumber);
    setSubmitStep(3);
    setSubmitting(false);
  }, [selectedProcedures, selectedPatient]);

  const handleResubmit = useCallback(async (claimId: string) => {
    setResubmittingId(claimId);
    await new Promise(r => setTimeout(r, 2000));
    setResubmittingId(null);
    setResubmittedIds(prev => new Set(prev).add(claimId));
  }, []);

  const deniedPartialClaims = useMemo(() => {
    return claims.filter(c => c.status === 'denied' || c.status === 'partial');
  }, [claims]);

  const deniedCount = deniedPartialClaims.length;

  return (
    <div className="claims-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Claims Management</h1>
          <p className="page-subtitle">Submit, track, and manage insurance claims</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <NavPill
          active={activeTab === 'submit'}
          onClick={() => setActiveTab('submit')}
          icon={<Send size={15} />}
        >
          Submit New
        </NavPill>
        <NavPill
          active={activeTab === 'track'}
          onClick={() => setActiveTab('track')}
          icon={<ClipboardList size={15} />}
        >
          Track Status
        </NavPill>
        <NavPill
          active={activeTab === 'denied'}
          onClick={() => setActiveTab('denied')}
          icon={<AlertTriangle size={15} />}
          badge={deniedCount}
        >
          Denied / Action Required
        </NavPill>
      </div>

      {/* ============= Submit New ============= */}
      {activeTab === 'submit' && (
        <div className="submit-tab">
          <Card>
            <div className="submit-section-title">Patient Search</div>
            <SearchBar
              placeholder="Search patients by name..."
              value={patientQuery}
              onChange={val => {
                setPatientQuery(val);
                if (val === '') setSelectedPatient(null);
              }}
              suggestions={patientResults.map(p => ({
                id: p.id,
                label: `${p.firstName} ${p.lastName}`,
                sublabel: `DOB: ${formatDate(p.dob)} | ${p.primaryInsurance?.carrierName || 'No Insurance'}`,
              }))}
              onSelect={handleSelectPatient}
            />
          </Card>

          {selectedPatient && submitStep < 0 && (
            <>
              <Card>
                <div className="submit-section-title">Completed Procedures</div>
                <p className="section-desc">Select procedures to include in the claim</p>
                <div className="procedure-list">
                  {MOCK_PROCEDURES.map(proc => (
                    <label key={proc.code} className="procedure-item">
                      <input
                        type="checkbox"
                        className="procedure-checkbox"
                        checked={selectedProcedures.has(proc.code)}
                        onChange={() => toggleProcedure(proc.code)}
                      />
                      <span className="procedure-code mono">{proc.code}</span>
                      <span className="procedure-desc">{proc.description}</span>
                      <span className="procedure-fee mono">{formatCurrency(proc.fee)}</span>
                    </label>
                  ))}
                </div>
              </Card>

              {selectedProcedures.size > 0 && (
                <Card accentColor="var(--accent)">
                  <div className="submit-section-title">Claim Preview</div>
                  <div className="preview-grid">
                    <div className="preview-field">
                      <span className="preview-label">Patient</span>
                      <span className="preview-value">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </span>
                    </div>
                    <div className="preview-field">
                      <span className="preview-label">Payer</span>
                      <span className="preview-value">
                        {selectedPatient.primaryInsurance?.carrierName || 'N/A'}
                      </span>
                    </div>
                    <div className="preview-field">
                      <span className="preview-label">Subscriber ID</span>
                      <span className="preview-value mono">
                        {selectedPatient.primaryInsurance?.subscriberId || 'N/A'}
                      </span>
                    </div>
                    <div className="preview-field">
                      <span className="preview-label">Provider</span>
                      <span className="preview-value">Dr. Sarah Mitchell, DDS</span>
                    </div>
                  </div>

                  <div className="preview-procedures">
                    <div className="preview-proc-header">
                      <span>Procedure</span>
                      <span>Fee</span>
                    </div>
                    {MOCK_PROCEDURES.filter(p => selectedProcedures.has(p.code)).map(p => (
                      <div key={p.code} className="preview-proc-row">
                        <span>
                          <span className="mono">{p.code}</span> {p.description}
                        </span>
                        <span className="mono">{formatCurrency(p.fee)}</span>
                      </div>
                    ))}
                    <div className="preview-proc-total">
                      <span>Total</span>
                      <span className="mono">{formatCurrency(selectedTotal)}</span>
                    </div>
                  </div>

                  <button
                    className="btn-submit-claim"
                    onClick={handleSubmitClaim}
                    disabled={submitting}
                  >
                    <Send size={16} />
                    Submit Claim
                  </button>
                </Card>
              )}
            </>
          )}

          {/* Submit Progress Stepper */}
          {submitStep >= 0 && submitStep < 3 && (
            <Card>
              <div className="submit-section-title">Submitting Claim...</div>
              <div className="stepper">
                {[
                  'Preparing claim data...',
                  'Submitting to Delta Dental...',
                  'Confirming submission...',
                ].map((label, i) => (
                  <div key={i} className="stepper-item">
                    <div className={`stepper-icon ${submitStep > i ? 'stepper-icon--done' : submitStep === i ? 'stepper-icon--active' : 'stepper-icon--pending'}`}>
                      {submitStep > i ? (
                        <CheckCircle2 size={20} />
                      ) : submitStep === i ? (
                        <Loader2 size={20} className="spin-icon" />
                      ) : (
                        <Clock size={20} />
                      )}
                    </div>
                    {i < 2 && (
                      <div className={`stepper-line ${submitStep > i ? 'stepper-line--done' : ''}`} />
                    )}
                    <span className={`stepper-label ${submitStep >= i ? 'stepper-label--active' : ''}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Success Card */}
          {submitStep === 3 && (
            <Card accentColor="var(--green)">
              <div className="success-card">
                <CheckCircle2 size={48} className="success-icon" />
                <h3 className="success-title">Claim Submitted Successfully</h3>
                <p className="success-desc">
                  Your claim has been submitted and is now being processed.
                </p>
                <div className="success-ref">
                  <span className="success-ref-label">Reference Number</span>
                  <span className="success-ref-value mono">{submitRef}</span>
                </div>
                <button
                  className="btn-new-claim"
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientQuery('');
                    setSelectedProcedures(new Set());
                    setSubmitStep(-1);
                    setSubmitRef('');
                  }}
                >
                  Submit Another Claim
                </button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ============= Track Status ============= */}
      {activeTab === 'track' && (
        <div className="track-tab">
          <Card padding="0">
            <div className="claims-table-wrap">
              <table className="claims-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Payer</th>
                    <th>Date Submitted</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Reference #</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingClaims ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6}>
                          <div className="skeleton" style={{ height: 20, borderRadius: 6 }} />
                        </td>
                      </tr>
                    ))
                  ) : claims.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-cell">No claims found.</td>
                    </tr>
                  ) : (
                    claims.map(claim => (
                      <tr
                        key={claim.id}
                        className="claims-row"
                        onClick={() => setSelectedClaim(claim)}
                      >
                        <td className="cell-patient">{claim.patientName}</td>
                        <td>{claim.payerName}</td>
                        <td className="mono">{formatDate(claim.dateSubmitted)}</td>
                        <td className="mono">{formatCurrency(claim.totalFee)}</td>
                        <td>
                          <Badge variant={claimStatusBadgeVariant(claim.status)} dot>
                            {claim.status}
                          </Badge>
                        </td>
                        <td className="mono">{claim.referenceNumber}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Claim Detail Modal */}
          <Modal
            open={!!selectedClaim}
            onClose={() => setSelectedClaim(null)}
            title={selectedClaim ? `Claim ${selectedClaim.referenceNumber}` : ''}
            width="720px"
          >
            {selectedClaim && (
              <div className="claim-detail">
                <div className="detail-header-grid">
                  <div className="detail-field">
                    <span className="detail-label">Patient</span>
                    <span className="detail-value">{selectedClaim.patientName}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Payer</span>
                    <span className="detail-value">{selectedClaim.payerName}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Provider</span>
                    <span className="detail-value">{selectedClaim.provider}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Status</span>
                    <Badge variant={claimStatusBadgeVariant(selectedClaim.status)} dot size="md">
                      {selectedClaim.status}
                    </Badge>
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="detail-section-title">Claim Timeline</h4>
                  <Timeline
                    items={selectedClaim.timeline.map((t, i) => ({
                      id: `tl-${i}`,
                      timestamp: formatDate(t.date),
                      title: t.status.charAt(0).toUpperCase() + t.status.slice(1),
                      description: t.description,
                      status: (
                        t.status === 'paid' || t.status === 'approved' ? 'success' :
                        t.status === 'denied' ? 'error' :
                        t.status === 'partial' ? 'warning' :
                        'info'
                      ) as 'success' | 'info' | 'warning' | 'error',
                    }))}
                  />
                </div>

                <div className="detail-section">
                  <h4 className="detail-section-title">Line Items</h4>
                  <div className="line-items-table-wrap">
                    <table className="line-items-table">
                      <thead>
                        <tr>
                          <th>Procedure</th>
                          <th>Tooth#</th>
                          <th>Fee</th>
                          <th>Allowed</th>
                          <th>Paid</th>
                          <th>Adj</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedClaim.lineItems.map((li, i) => (
                          <tr key={i}>
                            <td>
                              <span className="mono">{li.procedureCode}</span>{' '}
                              <span className="li-desc">{li.procedureDescription}</span>
                            </td>
                            <td className="mono">{li.toothNumber || '-'}</td>
                            <td className="mono">{formatCurrency(li.fee)}</td>
                            <td className="mono">{li.allowedAmount != null ? formatCurrency(li.allowedAmount) : '-'}</td>
                            <td className="mono">{li.paidAmount != null ? formatCurrency(li.paidAmount) : '-'}</td>
                            <td className="mono">{li.adjustmentAmount != null ? formatCurrency(li.adjustmentAmount) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="detail-summary">
                  <div className="summary-item">
                    <span className="summary-label">Total Billed</span>
                    <span className="summary-value mono">{formatCurrency(selectedClaim.totalFee)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Total Allowed</span>
                    <span className="summary-value mono">
                      {selectedClaim.allowedAmount != null ? formatCurrency(selectedClaim.allowedAmount) : '-'}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Total Paid</span>
                    <span className="summary-value mono" style={{ color: 'var(--green)' }}>
                      {selectedClaim.paidAmount != null ? formatCurrency(selectedClaim.paidAmount) : '-'}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Patient Responsibility</span>
                    <span className="summary-value mono" style={{ color: 'var(--amber)' }}>
                      {selectedClaim.patientResp != null ? formatCurrency(selectedClaim.patientResp) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Modal>
        </div>
      )}

      {/* ============= Denied / Action Required ============= */}
      {activeTab === 'denied' && (
        <div className="denied-tab">
          {loadingClaims ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14, marginBottom: 12 }} />
            ))
          ) : deniedPartialClaims.length === 0 ? (
            <Card>
              <div className="empty-state">
                <CheckCircle2 size={32} style={{ color: 'var(--green)', marginBottom: 8 }} />
                <p>No denied or action-required claims. Everything looks good.</p>
              </div>
            </Card>
          ) : (
            deniedPartialClaims.map(claim => (
              <Card key={claim.id} padding="var(--space-lg)" className="denied-card">
                <div className="denied-header">
                  <div className="denied-patient">
                    <span className="denied-patient-name">{claim.patientName}</span>
                    <span className="denied-payer">{claim.payerName}</span>
                  </div>
                  <div className="denied-amount">
                    <span className="denied-fee mono">{formatCurrency(claim.totalFee)}</span>
                    <Badge variant={claimStatusBadgeVariant(claim.status)} dot>
                      {claim.status}
                    </Badge>
                  </div>
                </div>

                {claim.denialReason && (
                  <div className="denial-reason-card">
                    <XCircle size={16} />
                    <div className="denial-reason-text">
                      <span className="denial-reason-label">Denial Reason</span>
                      <span className="denial-reason-value">{claim.denialReason}</span>
                    </div>
                  </div>
                )}

                {claim.suggestedAction && (
                  <div className="suggested-action">
                    <ArrowRight size={14} />
                    <span>{claim.suggestedAction}</span>
                  </div>
                )}

                <div className="denied-meta">
                  <span className="denied-ref mono">Ref: {claim.referenceNumber}</span>
                  <span className="denied-date">Submitted {formatDate(claim.dateSubmitted)}</span>
                </div>

                <div className="denied-actions">
                  {resubmittedIds.has(claim.id) ? (
                    <span className="resubmit-confirm">Resubmitted &#10003;</span>
                  ) : (
                    <button
                      className="btn-resubmit"
                      onClick={() => handleResubmit(claim.id)}
                      disabled={resubmittingId === claim.id}
                    >
                      {resubmittingId === claim.id ? (
                        <><Loader2 size={14} className="spin-icon" /> Resubmitting...</>
                      ) : (
                        <><RefreshCw size={14} /> Resubmit</>
                      )}
                    </button>
                  )}
                  <button
                    className="btn-view-detail"
                    onClick={() => setSelectedClaim(claim)}
                  >
                    View Details
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <style jsx>{`
        .claims-page {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
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

        /* Tabs */
        .tab-bar {
          display: flex;
          gap: var(--space-sm);
          flex-wrap: wrap;
        }

        /* Submit Tab */
        .submit-tab {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .submit-section-title {
          font-size: var(--text-md);
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--space-md);
        }
        .section-desc {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin-bottom: var(--space-md);
          margin-top: -8px;
        }

        /* Procedure List */
        .procedure-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        .procedure-item {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .procedure-item:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: var(--border-hover);
        }
        .procedure-checkbox {
          width: 18px;
          height: 18px;
          accent-color: var(--accent);
          cursor: pointer;
          flex-shrink: 0;
        }
        .procedure-code {
          font-size: var(--text-sm);
          color: var(--accent-text);
          font-weight: 600;
          min-width: 60px;
        }
        .procedure-desc {
          flex: 1;
          font-size: var(--text-sm);
          color: var(--text-primary);
        }
        .procedure-fee {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          font-weight: 500;
        }

        /* Preview */
        .preview-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }
        @media (max-width: 520px) {
          .preview-grid {
            grid-template-columns: 1fr;
          }
        }
        .preview-field {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .preview-label {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 500;
        }
        .preview-value {
          font-size: var(--text-sm);
          color: var(--text-primary);
          font-weight: 500;
        }
        .preview-procedures {
          border-top: 1px solid var(--border);
          padding-top: var(--space-md);
          margin-bottom: var(--space-lg);
        }
        .preview-proc-header {
          display: flex;
          justify-content: space-between;
          padding: var(--space-sm) 0;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 500;
        }
        .preview-proc-row {
          display: flex;
          justify-content: space-between;
          padding: var(--space-sm) 0;
          font-size: var(--text-sm);
          color: var(--text-primary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .preview-proc-total {
          display: flex;
          justify-content: space-between;
          padding: var(--space-md) 0 0;
          font-size: var(--text-base);
          font-weight: 700;
          color: var(--text-primary);
        }
        .btn-submit-claim {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: var(--accent);
          color: var(--bg-deepest);
          font-weight: 600;
          font-size: var(--text-sm);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          border: none;
        }
        .btn-submit-claim:hover:not(:disabled) {
          background: var(--accent-hover);
          box-shadow: var(--shadow-glow);
        }
        .btn-submit-claim:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Stepper */
        .stepper {
          display: flex;
          flex-direction: column;
          gap: 0;
          padding: var(--space-sm) 0;
        }
        .stepper-item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-md);
          position: relative;
          padding-bottom: var(--space-lg);
        }
        .stepper-item:last-child {
          padding-bottom: 0;
        }
        .stepper-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          flex-shrink: 0;
          transition: all var(--transition-base);
        }
        .stepper-icon--done {
          color: var(--green);
          background: var(--green-dim);
        }
        .stepper-icon--active {
          color: var(--accent-text);
          background: var(--accent-dim);
        }
        .stepper-icon--pending {
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.04);
        }
        .stepper-line {
          position: absolute;
          left: 15px;
          top: 36px;
          width: 2px;
          height: calc(100% - 40px);
          background: var(--border);
          transition: background var(--transition-base);
        }
        .stepper-line--done {
          background: var(--green);
        }
        .stepper-label {
          font-size: var(--text-sm);
          color: var(--text-tertiary);
          padding-top: 6px;
          transition: color var(--transition-base);
        }
        .stepper-label--active {
          color: var(--text-primary);
          font-weight: 500;
        }

        /* Spinner */
        .claims-page :global(.spin-icon) {
          animation: spin 1s linear infinite;
        }

        /* Success Card */
        .success-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: var(--space-md);
          padding: var(--space-xl) 0;
          animation: fadeInScale 0.3s ease forwards;
        }
        .success-card :global(.success-icon) {
          color: var(--green);
        }
        .success-title {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--text-primary);
        }
        .success-desc {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          max-width: 360px;
        }
        .success-ref {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: var(--space-md) var(--space-xl);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }
        .success-ref-label {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .success-ref-value {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--accent-text);
        }
        .btn-new-claim {
          padding: 10px 20px;
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--accent-text);
          background: var(--accent-dim);
          border: 1px solid rgba(34, 211, 238, 0.15);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }
        .btn-new-claim:hover {
          background: rgba(34, 211, 238, 0.25);
        }

        /* Track Tab - Table */
        .track-tab {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .claims-table-wrap {
          overflow-x: auto;
        }
        .claims-table {
          width: 100%;
          border-collapse: collapse;
        }
        .claims-table th {
          text-align: left;
          padding: var(--space-md) var(--space-lg);
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--border);
        }
        .claims-table td {
          padding: var(--space-md) var(--space-lg);
          font-size: var(--text-sm);
          color: var(--text-secondary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }
        .claims-row {
          cursor: pointer;
          transition: background var(--transition-fast);
        }
        .claims-row:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .cell-patient {
          color: var(--text-primary);
          font-weight: 500;
        }
        .empty-cell {
          text-align: center;
          padding: var(--space-xl);
          color: var(--text-tertiary);
        }

        /* Claim Detail Modal */
        .claim-detail {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }
        .detail-header-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-md);
        }
        @media (max-width: 520px) {
          .detail-header-grid {
            grid-template-columns: 1fr;
          }
        }
        .detail-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .detail-label {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 500;
        }
        .detail-value {
          font-size: var(--text-sm);
          color: var(--text-primary);
          font-weight: 500;
        }
        .detail-section {
          border-top: 1px solid var(--border);
          padding-top: var(--space-md);
        }
        .detail-section-title {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--space-md);
        }
        .line-items-table-wrap {
          overflow-x: auto;
        }
        .line-items-table {
          width: 100%;
          border-collapse: collapse;
        }
        .line-items-table th {
          text-align: left;
          padding: var(--space-sm) var(--space-md);
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .line-items-table td {
          padding: var(--space-sm) var(--space-md);
          font-size: var(--text-xs);
          color: var(--text-secondary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }
        .li-desc {
          color: var(--text-tertiary);
          font-size: var(--text-xs);
        }

        /* Summary */
        .detail-summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
          padding: var(--space-md);
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
        }
        @media (max-width: 600px) {
          .detail-summary {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .summary-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .summary-label {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          font-weight: 500;
        }
        .summary-value {
          font-size: var(--text-base);
          font-weight: 700;
          color: var(--text-primary);
        }

        /* Denied Tab */
        .denied-tab {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: var(--space-xl);
          color: var(--text-tertiary);
          font-size: var(--text-sm);
        }
        .denied-card {
          animation: fadeIn var(--transition-base) ease forwards;
        }
        .denied-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-md);
        }
        .denied-patient {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .denied-patient-name {
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--text-primary);
        }
        .denied-payer {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .denied-amount {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: var(--space-sm);
        }
        .denied-fee {
          font-size: var(--text-md);
          font-weight: 700;
          color: var(--text-primary);
        }

        /* Denial Reason Card */
        .denial-reason-card {
          display: flex;
          gap: var(--space-sm);
          padding: var(--space-md);
          background: var(--red-dim);
          border: 1px solid rgba(248, 113, 113, 0.2);
          border-radius: var(--radius-md);
          color: var(--red);
          margin-bottom: var(--space-md);
        }
        .denial-reason-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .denial-reason-label {
          font-size: var(--text-xs);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .denial-reason-value {
          font-size: var(--text-sm);
          color: var(--text-primary);
          line-height: 1.5;
        }

        /* Suggested Action */
        .suggested-action {
          display: flex;
          align-items: flex-start;
          gap: var(--space-sm);
          padding: var(--space-md);
          background: rgba(251, 191, 36, 0.08);
          border: 1px solid rgba(251, 191, 36, 0.15);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          color: var(--amber);
          margin-bottom: var(--space-md);
          line-height: 1.5;
        }

        .denied-meta {
          display: flex;
          gap: var(--space-lg);
          margin-bottom: var(--space-md);
        }
        .denied-ref {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .denied-date {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }

        .denied-actions {
          display: flex;
          gap: var(--space-sm);
          align-items: center;
        }
        .btn-resubmit {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--accent);
          color: var(--bg-deepest);
          font-weight: 600;
          font-size: var(--text-sm);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          border: none;
        }
        .btn-resubmit:hover:not(:disabled) {
          background: var(--accent-hover);
          box-shadow: var(--shadow-glow);
        }
        .btn-resubmit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .btn-view-detail {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }
        .btn-view-detail:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
          border-color: var(--border-hover);
        }
        .resubmit-confirm {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--green);
          animation: fadeIn var(--transition-base) ease forwards;
        }
      `}</style>
    </div>
  );
}
