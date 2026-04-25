'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Search, Loader2, CheckCircle2, Clock,
  DollarSign, Building2, AlertCircle,
} from 'lucide-react';
import { SearchBar } from '@/components/ui/SearchBar';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRole } from '@/context/RoleContext';
import { api } from '@/lib/api';
import { mapApiPatientToPatient } from '@/lib/adapters';
import {
  formatCurrency, formatDate, formatPhone, getInitials, formatPercent,
} from '@/lib/formatters';
import type { Patient, EligibilityResult } from '@/types';
import type {
  PaginatedResponse, SingleResponse, ApiPatient, ApiEligibilityCheck, ApiEligibilityStats,
} from '@/types/api';

const progressMessages = [
  'Connecting to portal...',
  'Submitting patient data...',
  'Retrieving benefits...',
];

// Map backend eligibility result to frontend shape
function mapEligibilityResult(check: ApiEligibilityCheck): EligibilityResult {
  const d = (check.resultDetails ?? {}) as Record<string, unknown>;
  return {
    patientId: check.patientId,
    payerName: check.payerName,
    checkedAt: check.completedAt ?? check.createdAt,
    status: check.eligibilityResult === 'eligible' ? 'active' : check.eligibilityResult === 'ineligible' ? 'inactive' : 'unknown',
    effectiveDate: check.effectiveDate ?? '',
    terminationDate: check.terminationDate ?? undefined,
    planName: (d.planName as string) ?? check.managedCarePlan ?? '',
    planType: (d.planType as string) ?? check.payerType ?? '',
    deductibleIndividual: (d.deductibleIndividual as number) ?? 0,
    deductibleUsed: (d.deductibleUsed as number) ?? 0,
    deductibleRemaining: (d.deductibleRemaining as number) ?? 0,
    annualMaximum: (d.annualMaximum as number) ?? 0,
    annualMaxUsed: (d.annualMaxUsed as number) ?? 0,
    annualMaxRemaining: (d.annualMaxRemaining as number) ?? 0,
    preventiveCoverage: (d.preventiveCoverage as number) ?? 0,
    basicCoverage: (d.basicCoverage as number) ?? 0,
    majorCoverage: (d.majorCoverage as number) ?? 0,
    orthodonticCoverage: (d.orthodonticCoverage as number) ?? 0,
    copayPreventive: (d.copayPreventive as number) ?? 0,
    copayBasic: (d.copayBasic as number) ?? 0,
    copayMajor: (d.copayMajor as number) ?? 0,
    waitingPeriods: {
      basic: (d.waitingPeriodBasic as string) ?? 'None',
      major: (d.waitingPeriodMajor as string) ?? 'None',
      orthodontic: (d.waitingPeriodOrtho as string) ?? 'None',
    },
    inNetwork: (d.inNetwork as boolean) ?? true,
    notes: check.errorMessage ?? undefined,
  };
}

export default function EligibilityPage() {
  const { role } = useRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; label: string; sublabel?: string }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedInsuranceId, setSelectedInsuranceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [historyData, setHistoryData] = useState<{ id: string; date: string; payer: string; status: string; patientName: string }[]>([]);
  const [stats, setStats] = useState<ApiEligibilityStats | null>(null);
  const [progressIdx, setProgressIdx] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load eligibility history
  useEffect(() => {
    api.get<PaginatedResponse<ApiEligibilityCheck>>('/api/eligibility?limit=20')
      .then(res => {
        setHistoryData(res.data.map(c => ({
          id: c.id,
          date: c.completedAt ?? c.createdAt,
          payer: c.payerName,
          status: c.eligibilityResult,
          patientName: `${c.patientFirstName ?? ''} ${c.patientLastName ?? ''}`.trim(),
        })));
      })
      .catch(() => {});
  }, [result]);

  // Load stats (admin+ only)
  useEffect(() => {
    if (role === 'staff_user') return;
    api.get<{ data: ApiEligibilityStats }>('/api/eligibility/stats')
      .then(res => setStats(res.data))
      .catch(() => {});
  }, [role, result]);

  // Search patients as user types
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get<PaginatedResponse<ApiPatient>>(`/api/patients?search=${encodeURIComponent(searchQuery)}&limit=10`);
        if (!cancelled) {
          setSuggestions(
            res.data.map((p) => ({
              id: p.id,
              label: `${p.firstName} ${p.lastName}`,
              sublabel: p.primaryInsurance?.carrierName || 'No Insurance',
            }))
          );
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Select a patient
  async function handleSelectPatient(id: string) {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.get<SingleResponse<ApiPatient & { insurance?: Array<{ id: string; ordinal: number; carrierName: string | null }> }>>(`/api/patients/${id}`);
      const pat = mapApiPatientToPatient(res.data);
      const primary = res.data.insurance?.find(i => i.ordinal === 1);
      if (primary) {
        setSelectedInsuranceId(primary.id);
      }
      setSelectedPatient(pat);
      setSearchQuery(`${pat.firstName} ${pat.lastName}`);
    } catch {
      setSelectedPatient(null);
    }
    setSuggestions([]);
    setLoading(false);
  }

  // Run eligibility check
  async function handleRunCheck() {
    if (!selectedPatient || !selectedInsuranceId) return;
    setChecking(true);
    setResult(null);
    setProgressIdx(0);

    intervalRef.current = setInterval(() => {
      setProgressIdx((prev) => (prev + 1) % progressMessages.length);
    }, 900);

    try {
      const res = await api.post<SingleResponse<ApiEligibilityCheck>>('/api/eligibility/verify', {
        patientId: selectedPatient.id,
        insuranceId: selectedInsuranceId,
      });
      setResult(mapEligibilityResult(res.data));
    } catch {
      setResult(null);
    } finally {
      setChecking(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }

  const carrier = selectedPatient?.primaryInsurance?.carrierName ?? 'payer';

  return (
    <div className="elig-page">
      {/* Header */}
      <header className="elig-header">
        <div className="elig-title-row">
          <ShieldCheck size={24} />
          <h1 className="elig-title">Eligibility Verification</h1>
        </div>
        <p className="elig-subtitle">
          Verify patient insurance coverage and benefits in real time
        </p>
      </header>

      {/* Search */}
      <div className="elig-search">
        <SearchBar
          placeholder="Search patients by name..."
          value={searchQuery}
          onChange={(val) => {
            setSearchQuery(val);
            if (!val) {
              setSelectedPatient(null);
              setResult(null);
            }
          }}
          suggestions={suggestions}
          onSelect={handleSelectPatient}
        />
      </div>

      {/* Selected patient info + run button */}
      {loading && (
        <Card>
          <div className="loading-row">
            <Loader2 size={18} className="spin-icon" />
            <span>Loading patient...</span>
          </div>
        </Card>
      )}

      {selectedPatient && !loading && (
        <div className="elig-patient-section">
          {/* Insurance info panel */}
          <Card accentColor="var(--accent)">
            <div className="ins-panel">
              <div className="ins-panel__top">
                <Avatar
                  initials={getInitials(`${selectedPatient.firstName} ${selectedPatient.lastName}`)}
                  size={42}
                />
                <div className="ins-panel__patient">
                  <span className="ins-panel__name">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </span>
                  <span className="ins-panel__dob mono">
                    DOB: {formatDate(selectedPatient.dob)} | {formatPhone(selectedPatient.phone)}
                  </span>
                </div>
              </div>

              {selectedPatient.primaryInsurance ? (
                <div className="ins-panel__details">
                  <div className="ins-detail-row">
                    <span className="ins-detail-key">Carrier</span>
                    <span className="ins-detail-val">{selectedPatient.primaryInsurance.carrierName}</span>
                  </div>
                  <div className="ins-detail-row">
                    <span className="ins-detail-key">Plan</span>
                    <span className="ins-detail-val">{selectedPatient.primaryInsurance.planName}</span>
                  </div>
                  <div className="ins-detail-row">
                    <span className="ins-detail-key">Subscriber ID</span>
                    <span className="ins-detail-val mono">{selectedPatient.primaryInsurance.subscriberId}</span>
                  </div>
                  <div className="ins-detail-row">
                    <span className="ins-detail-key">Group #</span>
                    <span className="ins-detail-val mono">{selectedPatient.primaryInsurance.groupNumber}</span>
                  </div>
                </div>
              ) : (
                <div className="ins-panel__none">
                  <AlertCircle size={16} />
                  <span>No insurance on file</span>
                </div>
              )}

              <button
                className="run-check-btn"
                onClick={handleRunCheck}
                disabled={checking || !selectedInsuranceId}
              >
                {checking ? (
                  <>
                    <Loader2 size={16} className="spin-icon" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Run Eligibility Check
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Checking animation */}
      {checking && (
        <Card>
          <div className="checking-card">
            <div className="checking-spinner">
              <Loader2 size={32} className="spin-icon" />
            </div>
            <div className="checking-text">
              <span className="checking-carrier">
                Verifying coverage with {carrier}
                <span className="animated-dots" />
              </span>
              <span className="checking-step">{progressMessages[progressIdx]}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Results */}
      {result && !checking && (
        <div className="result-section">
          {/* Coverage Status */}
          <Card accentColor="var(--green)">
            <div className="result-block">
              <h3 className="result-block__title">
                <CheckCircle2 size={16} />
                Coverage Status
              </h3>
              <div className="result-block__row">
                <span>Status</span>
                <Badge variant="green" dot size="md">Active</Badge>
              </div>
              <div className="result-block__row">
                <span>Plan</span>
                <span className="result-val">{result.planName} ({result.planType})</span>
              </div>
              <div className="result-block__row">
                <span>Effective Date</span>
                <span className="result-val mono">{formatDate(result.effectiveDate)}</span>
              </div>
              <div className="result-block__row">
                <span>In-Network</span>
                <Badge variant={result.inNetwork ? 'green' : 'red'} size="sm">
                  {result.inNetwork ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Benefits Summary */}
          <Card>
            <div className="result-block">
              <h3 className="result-block__title">
                <ShieldCheck size={16} />
                Benefits Summary
              </h3>
              <div className="benefits-grid">
                <div className="benefit-item">
                  <span className="benefit-label">Preventive</span>
                  <span className="benefit-pct mono" style={{ color: 'var(--green)' }}>
                    {result.preventiveCoverage}%
                  </span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-label">Basic</span>
                  <span className="benefit-pct mono" style={{ color: 'var(--accent)' }}>
                    {result.basicCoverage}%
                  </span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-label">Major</span>
                  <span className="benefit-pct mono" style={{ color: 'var(--amber)' }}>
                    {result.majorCoverage}%
                  </span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-label">Ortho</span>
                  <span className="benefit-pct mono" style={{ color: 'var(--text-muted)' }}>
                    {result.orthodonticCoverage}%
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Deductible + Annual Max */}
          <div className="bars-grid">
            <Card>
              <div className="result-block">
                <h3 className="result-block__title">
                  <DollarSign size={16} />
                  Deductible
                </h3>
                <div className="bar-labels">
                  <span className="bar-label-left">
                    Used: <span className="mono">{formatCurrency(result.deductibleUsed)}</span>
                  </span>
                  <span className="bar-label-right">
                    Remaining: <span className="mono">{formatCurrency(result.deductibleRemaining)}</span>
                  </span>
                </div>
                <ProgressBar
                  value={result.deductibleUsed}
                  max={result.deductibleIndividual}
                  color="var(--accent)"
                  height={8}
                  animated
                  showLabel
                />
                <span className="bar-total mono">
                  Individual Max: {formatCurrency(result.deductibleIndividual)}
                </span>
              </div>
            </Card>

            <Card>
              <div className="result-block">
                <h3 className="result-block__title">
                  <DollarSign size={16} />
                  Annual Maximum
                </h3>
                <div className="bar-labels">
                  <span className="bar-label-left">
                    Used: <span className="mono">{formatCurrency(result.annualMaxUsed)}</span>
                  </span>
                  <span className="bar-label-right">
                    Remaining: <span className="mono">{formatCurrency(result.annualMaxRemaining)}</span>
                  </span>
                </div>
                <ProgressBar
                  value={result.annualMaxUsed}
                  max={result.annualMaximum}
                  color={result.annualMaxRemaining < 500 ? 'var(--amber)' : 'var(--green)'}
                  height={8}
                  animated
                  showLabel
                />
                <span className="bar-total mono">
                  Annual Max: {formatCurrency(result.annualMaximum)}
                </span>
              </div>
            </Card>
          </div>

          {/* Copays + Waiting Periods */}
          <div className="bars-grid">
            <Card>
              <div className="result-block">
                <h3 className="result-block__title">
                  <DollarSign size={16} />
                  Copays
                </h3>
                <div className="result-block__row">
                  <span>Preventive</span>
                  <span className="result-val mono">{formatCurrency(result.copayPreventive)}</span>
                </div>
                <div className="result-block__row">
                  <span>Basic</span>
                  <span className="result-val mono">{formatCurrency(result.copayBasic)}</span>
                </div>
                <div className="result-block__row">
                  <span>Major</span>
                  <span className="result-val mono">{formatCurrency(result.copayMajor)}</span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="result-block">
                <h3 className="result-block__title">
                  <Clock size={16} />
                  Waiting Periods
                </h3>
                <div className="result-block__row">
                  <span>Basic</span>
                  <span className="result-val">{result.waitingPeriods.basic}</span>
                </div>
                <div className="result-block__row">
                  <span>Major</span>
                  <span className="result-val">{result.waitingPeriods.major}</span>
                </div>
                <div className="result-block__row">
                  <span>Orthodontic</span>
                  <span className="result-val">{result.waitingPeriods.orthodontic}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* History section */}
      {historyData.length > 0 && !checking && (
        <div className="history-section">
          <Card>
            <div className="result-block">
              <h3 className="result-block__title">
                <Clock size={16} />
                Verification History
              </h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Patient</th>
                      <th>Payer</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((h) => {
                      const statusVariant = h.status === 'eligible' ? 'green' as const : h.status === 'ineligible' ? 'red' as const : 'amber' as const;
                      return (
                        <tr key={h.id}>
                          <td className="mono">{formatDate(h.date)}</td>
                          <td>{h.patientName || '—'}</td>
                          <td>{h.payer}</td>
                          <td>
                            <Badge variant={statusVariant} dot size="sm">
                              {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Empty state when nothing selected */}
      {!selectedPatient && !loading && (
        <Card>
          <EmptyState
            icon={<Search size={40} />}
            title="Select a Patient"
            description="Search for a patient above to verify their insurance eligibility and benefits."
          />
        </Card>
      )}

      <style jsx>{`
        .elig-page {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
          animation: fadeIn var(--transition-base) ease forwards;
        }
        .elig-header {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        .elig-title-row {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          color: var(--accent);
        }
        .elig-title {
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--text-primary);
        }
        .elig-subtitle {
          font-size: var(--text-sm);
          color: var(--text-tertiary);
        }
        .elig-search {
          max-width: 480px;
        }

        /* Loading row */
        .loading-row {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          color: var(--text-secondary);
          font-size: var(--text-sm);
        }

        /* Insurance panel */
        .elig-patient-section {
          max-width: 520px;
        }
        .ins-panel {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .ins-panel__top {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }
        .ins-panel__patient {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .ins-panel__name {
          font-size: var(--text-md);
          font-weight: 600;
          color: var(--text-primary);
        }
        .ins-panel__dob {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .ins-panel__details {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          padding-top: var(--space-sm);
          border-top: 1px solid var(--border);
        }
        .ins-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ins-detail-key {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .ins-detail-val {
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
        .ins-panel__none {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          color: var(--red);
          font-size: var(--text-sm);
          padding-top: var(--space-sm);
          border-top: 1px solid var(--border);
        }

        /* Run check button */
        .run-check-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
          padding: 12px 24px;
          background: linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(34, 211, 238, 0.08));
          backdrop-filter: blur(8px);
          border: 1px solid rgba(34, 211, 238, 0.3);
          border-radius: var(--radius-md);
          color: var(--accent-text);
          font-weight: 600;
          font-size: var(--text-sm);
          transition: all var(--transition-fast);
          cursor: pointer;
        }
        .run-check-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(34, 211, 238, 0.3), rgba(34, 211, 238, 0.15));
          border-color: rgba(34, 211, 238, 0.5);
          box-shadow: 0 0 20px rgba(34, 211, 238, 0.15);
          transform: translateY(-1px);
        }
        .run-check-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Checking animation */
        .checking-card {
          display: flex;
          align-items: center;
          gap: var(--space-lg);
          padding: var(--space-md) 0;
        }
        .checking-spinner {
          color: var(--accent);
          flex-shrink: 0;
        }
        .checking-text {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        .checking-carrier {
          font-size: var(--text-md);
          font-weight: 600;
          color: var(--text-primary);
        }
        .animated-dots::after {
          content: '';
          animation: dots 1.5s steps(4, end) infinite;
        }
        @keyframes dots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
        .checking-step {
          font-size: var(--text-sm);
          color: var(--accent-text);
          animation: fadeIn 0.3s ease;
        }

        /* Spin icon */
        :global(.spin-icon) {
          animation: spin 1s linear infinite;
        }

        /* Result section */
        .result-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
          animation: fadeIn var(--transition-base) ease forwards;
        }
        .result-block {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .result-block__title {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .result-block__row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-xs) 0;
          border-bottom: 1px solid var(--border);
          font-size: var(--text-sm);
          color: var(--text-tertiary);
        }
        .result-block__row:last-child {
          border-bottom: none;
        }
        .result-val {
          color: var(--text-secondary);
        }

        /* Benefits grid */
        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
        }
        .benefit-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-md);
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
        }
        .benefit-label {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .benefit-pct {
          font-size: var(--text-xl);
          font-weight: 700;
        }

        /* Progress bar helpers */
        .bars-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: var(--space-lg);
        }
        .bar-labels {
          display: flex;
          justify-content: space-between;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .bar-label-left,
        .bar-label-right {
          display: flex;
          gap: 4px;
        }
        .bar-total {
          font-size: var(--text-xs);
          color: var(--text-muted);
          text-align: center;
        }

        /* History section */
        .history-section {
          animation: fadeIn var(--transition-base) ease forwards;
        }
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

        @media (max-width: 640px) {
          .benefits-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .bars-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
