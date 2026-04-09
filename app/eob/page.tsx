'use client';

import { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, RefreshCw, Clock, Filter } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { NavPill } from '@/components/ui/NavPill';
import { InfoIcon } from '@/components/ui/InfoIcon';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { EOB } from '@/types';

const mockEOBs: EOB[] = [
  {
    id: 'eob_1', claimId: 'clm_1', patientId: 'pat_1', patientName: 'Maria Santos',
    clinicId: 'clinic_1', payerId: 'delta_dental', payerName: 'Delta Dental',
    dateOfService: '2026-03-10', dateReceived: '2026-03-25', checkNumber: 'CHK-445921',
    totalBilled: 345.00, totalAllowed: 310.00, totalPaid: 248.00,
    totalPatientResp: 62.00, totalAdjustment: 35.00,
    lineItems: [
      { procedureCode: 'D0120', procedureDescription: 'Periodic Oral Evaluation', fee: 52.00, allowedAmount: 48.00, deductible: 0, copay: 0, paidAmount: 48.00, patientResp: 0, adjustmentAmount: 4.00 },
      { procedureCode: 'D1110', procedureDescription: 'Prophylaxis - Adult', fee: 108.00, allowedAmount: 98.00, deductible: 0, copay: 0, paidAmount: 98.00, patientResp: 0, adjustmentAmount: 10.00 },
      { procedureCode: 'D2391', procedureDescription: 'Resin Composite - 1 Surface, Posterior', toothNumber: '14', fee: 185.00, allowedAmount: 164.00, deductible: 0, copay: 0, paidAmount: 102.00, patientResp: 62.00, adjustmentAmount: 21.00 },
    ],
  },
  {
    id: 'eob_2', claimId: 'clm_3', patientId: 'pat_3', patientName: 'James Wilson',
    clinicId: 'clinic_1', payerId: 'cigna', payerName: 'Cigna',
    dateOfService: '2026-03-15', dateReceived: '2026-03-28', checkNumber: 'CHK-773201',
    totalBilled: 520.00, totalAllowed: 475.00, totalPaid: 380.00,
    totalPatientResp: 95.00, totalAdjustment: 45.00,
    lineItems: [
      { procedureCode: 'D0274', procedureDescription: 'Bitewings - Four Films', fee: 68.00, allowedAmount: 62.00, deductible: 0, copay: 0, paidAmount: 62.00, patientResp: 0, adjustmentAmount: 6.00 },
      { procedureCode: 'D2740', procedureDescription: 'Crown - Porcelain/Ceramic', toothNumber: '30', fee: 452.00, allowedAmount: 413.00, deductible: 0, copay: 0, paidAmount: 318.00, patientResp: 95.00, adjustmentAmount: 39.00 },
    ],
  },
  {
    id: 'eob_3', claimId: 'clm_5', patientId: 'pat_5', patientName: 'Robert Kim',
    clinicId: 'clinic_1', payerId: 'metlife', payerName: 'MetLife',
    dateOfService: '2026-03-18', dateReceived: '2026-04-01', checkNumber: 'CHK-882445',
    totalBilled: 1250.00, totalAllowed: 1120.00, totalPaid: 784.00,
    totalPatientResp: 336.00, totalAdjustment: 130.00,
    lineItems: [
      { procedureCode: 'D4341', procedureDescription: 'Scaling and Root Planing - Per Quadrant', toothNumber: 'UR', fee: 312.00, allowedAmount: 280.00, deductible: 50.00, copay: 0, paidAmount: 184.00, patientResp: 96.00, adjustmentAmount: 32.00 },
      { procedureCode: 'D4341', procedureDescription: 'Scaling and Root Planing - Per Quadrant', toothNumber: 'UL', fee: 312.00, allowedAmount: 280.00, deductible: 0, copay: 0, paidAmount: 200.00, patientResp: 80.00, adjustmentAmount: 32.00 },
      { procedureCode: 'D4341', procedureDescription: 'Scaling and Root Planing - Per Quadrant', toothNumber: 'LR', fee: 312.00, allowedAmount: 280.00, deductible: 0, copay: 0, paidAmount: 200.00, patientResp: 80.00, adjustmentAmount: 32.00 },
      { procedureCode: 'D4341', procedureDescription: 'Scaling and Root Planing - Per Quadrant', toothNumber: 'LL', fee: 314.00, allowedAmount: 280.00, deductible: 0, copay: 0, paidAmount: 200.00, patientResp: 80.00, adjustmentAmount: 34.00 },
    ],
  },
  {
    id: 'eob_4', claimId: 'clm_8', patientId: 'pat_8', patientName: 'Linda Patel',
    clinicId: 'clinic_1', payerId: 'delta_dental', payerName: 'Delta Dental',
    dateOfService: '2026-03-20', dateReceived: '2026-04-03', checkNumber: 'CHK-556710',
    totalBilled: 160.00, totalAllowed: 148.00, totalPaid: 148.00,
    totalPatientResp: 0, totalAdjustment: 12.00,
    lineItems: [
      { procedureCode: 'D0120', procedureDescription: 'Periodic Oral Evaluation', fee: 52.00, allowedAmount: 48.00, deductible: 0, copay: 0, paidAmount: 48.00, patientResp: 0, adjustmentAmount: 4.00 },
      { procedureCode: 'D1110', procedureDescription: 'Prophylaxis - Adult', fee: 108.00, allowedAmount: 100.00, deductible: 0, copay: 0, paidAmount: 100.00, patientResp: 0, adjustmentAmount: 8.00 },
    ],
  },
  {
    id: 'eob_5', claimId: 'clm_10', patientId: 'pat_10', patientName: 'David Nguyen',
    clinicId: 'clinic_1', payerId: 'cigna', payerName: 'Cigna',
    dateOfService: '2026-03-22', dateReceived: '2026-04-05', checkNumber: 'CHK-991834',
    totalBilled: 235.00, totalAllowed: 212.00, totalPaid: 170.00,
    totalPatientResp: 42.00, totalAdjustment: 23.00,
    lineItems: [
      { procedureCode: 'D0120', procedureDescription: 'Periodic Oral Evaluation', fee: 52.00, allowedAmount: 48.00, deductible: 0, copay: 0, paidAmount: 48.00, patientResp: 0, adjustmentAmount: 4.00 },
      { procedureCode: 'D0274', procedureDescription: 'Bitewings - Four Films', fee: 68.00, allowedAmount: 62.00, deductible: 0, copay: 0, paidAmount: 62.00, patientResp: 0, adjustmentAmount: 6.00 },
      { procedureCode: 'D2392', procedureDescription: 'Resin Composite - 2 Surfaces, Posterior', toothNumber: '19', fee: 115.00, allowedAmount: 102.00, deductible: 0, copay: 0, paidAmount: 60.00, patientResp: 42.00, adjustmentAmount: 13.00 },
    ],
  },
];

const payerFilters = ['All', 'Delta Dental', 'Cigna', 'MetLife'];

export default function EOBPage() {
  const [selectedPayer, setSelectedPayer] = useState('All');
  const [selectedEOB, setSelectedEOB] = useState<EOB | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncLabel, setSyncLabel] = useState('2h ago');

  useEffect(() => {
    if (!lastSyncTime) return;
    const update = () => {
      const diff = Math.floor((Date.now() - lastSyncTime.getTime()) / 1000);
      if (diff < 5) setSyncLabel('Just now');
      else if (diff < 60) setSyncLabel(`${diff}s ago`);
      else if (diff < 3600) setSyncLabel(`${Math.floor(diff / 60)}m ago`);
      else setSyncLabel(`${Math.floor(diff / 3600)}h ago`);
    };
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, [lastSyncTime]);

  const filtered = selectedPayer === 'All'
    ? mockEOBs
    : mockEOBs.filter(e => e.payerName === selectedPayer);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSyncTime(new Date());
    }, 2000);
  };

  const handleDownload = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  return (
    <div className="eob-page">
      <div className="eob-header">
        <div>
          <h1 className="page-title">EOB Retrieval</h1>
          <p className="page-subtitle">Explanation of Benefits from insurance carriers</p>
        </div>
        <div className="eob-header__actions">
          <div className="eob-sync-status">
            <Clock size={14} />
            <span className="mono">Last sync: {syncLabel}</span>
          </div>
          <button className="btn-secondary" onClick={handleSync}>
            <RefreshCw size={14} className={syncing ? 'spinning' : ''} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      <div className="eob-filters">
        <Filter size={14} style={{ color: 'var(--text-tertiary)' }} />
        {payerFilters.map(p => (
          <NavPill key={p} active={selectedPayer === p} onClick={() => setSelectedPayer(p)}>
            {p}
          </NavPill>
        ))}
      </div>

      <Card padding="0">
        <table className="eob-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Payer</th>
              <th>Patient</th>
              <th>Check #</th>
              <th>Billed</th>
              <th>Allowed</th>
              <th>Paid</th>
              <th>Patient Resp</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((eob, i) => (
              <tr key={eob.id} className="eob-row" onClick={() => setSelectedEOB(eob)} style={{ animationDelay: `${i * 40}ms` }}>
                <td className="mono">{formatDate(eob.dateReceived)}</td>
                <td><Badge variant={eob.payerName === 'Delta Dental' ? 'cyan' : eob.payerName === 'Cigna' ? 'purple' : 'amber'}>{eob.payerName}</Badge></td>
                <td>{eob.patientName}</td>
                <td className="mono">{eob.checkNumber}</td>
                <td className="mono">{formatCurrency(eob.totalBilled)}</td>
                <td className="mono">{formatCurrency(eob.totalAllowed)}</td>
                <td className="mono" style={{ color: 'var(--green)' }}>{formatCurrency(eob.totalPaid)}</td>
                <td className="mono">{formatCurrency(eob.totalPatientResp)}</td>
                <td>
                  <button className="btn-icon" onClick={e => { e.stopPropagation(); handleDownload(); }} title="Download PDF">
                    <Download size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={!!selectedEOB} onClose={() => setSelectedEOB(null)} title={selectedEOB ? `EOB Detail — ${selectedEOB.patientName}` : ''} width="720px">
        {selectedEOB && (
          <div className="eob-detail">
            <div className="eob-detail__meta">
              <div className="eob-detail__meta-item">
                <span className="label">Payer</span>
                <span>{selectedEOB.payerName}</span>
              </div>
              <div className="eob-detail__meta-item">
                <span className="label">Check #</span>
                <span className="mono">{selectedEOB.checkNumber}</span>
              </div>
              <div className="eob-detail__meta-item">
                <span className="label">Date of Service</span>
                <span className="mono">{formatDate(selectedEOB.dateOfService)}</span>
              </div>
              <div className="eob-detail__meta-item">
                <span className="label">Date Received</span>
                <span className="mono">{formatDate(selectedEOB.dateReceived)}</span>
              </div>
            </div>

            <table className="eob-detail__table">
              <thead>
                <tr>
                  <th style={{ display: 'inline-flex', alignItems: 'center' }}>Procedure<InfoIcon text="The CDT code and description of the dental service performed" /></th>
                  <th style={{ display: 'inline-flex', alignItems: 'center' }}>Tooth<InfoIcon text="Tooth number using the Universal Numbering System" /></th>
                  <th style={{ display: 'inline-flex', alignItems: 'center' }}>Fee<InfoIcon text="Amount billed by the provider for this service" /></th>
                  <th style={{ display: 'inline-flex', alignItems: 'center' }}>Allowed<InfoIcon text="Maximum amount the insurance plan covers for this service" /></th>
                  <th style={{ display: 'inline-flex', alignItems: 'center' }}>Deduct.<InfoIcon text="Portion applied to the patient's annual deductible" /></th>
                  <th style={{ display: 'inline-flex', alignItems: 'center' }}>Paid<InfoIcon text="Amount actually paid by the insurance carrier" /></th>
                  <th style={{ display: 'inline-flex', alignItems: 'center' }}>Pt Resp<InfoIcon text="Total amount the patient is responsible for paying" /></th>
                  <th style={{ display: 'inline-flex', alignItems: 'center' }}>Adj<InfoIcon text="Difference between the billed fee and the allowed amount (write-off)" /></th>
                </tr>
              </thead>
              <tbody>
                {selectedEOB.lineItems.map((li, i) => (
                  <tr key={i}>
                    <td>
                      <span className="mono" style={{ color: 'var(--accent-text)' }}>{li.procedureCode}</span>
                      <br />
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{li.procedureDescription}</span>
                    </td>
                    <td className="mono">{li.toothNumber || '—'}</td>
                    <td className="mono">{formatCurrency(li.fee)}</td>
                    <td className="mono">{formatCurrency(li.allowedAmount)}</td>
                    <td className="mono">{formatCurrency(li.deductible)}</td>
                    <td className="mono" style={{ color: 'var(--green)' }}>{formatCurrency(li.paidAmount)}</td>
                    <td className="mono">{formatCurrency(li.patientResp)}</td>
                    <td className="mono" style={{ color: 'var(--text-tertiary)' }}>{formatCurrency(li.adjustmentAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="eob-detail__summary">
              <div className="summary-row">
                <span>Total Billed</span>
                <span className="mono">{formatCurrency(selectedEOB.totalBilled)}</span>
              </div>
              <div className="summary-row">
                <span>Total Allowed</span>
                <span className="mono">{formatCurrency(selectedEOB.totalAllowed)}</span>
              </div>
              <div className="summary-row" style={{ color: 'var(--green)' }}>
                <span>Total Paid</span>
                <span className="mono">{formatCurrency(selectedEOB.totalPaid)}</span>
              </div>
              <div className="summary-row">
                <span>Patient Responsibility</span>
                <span className="mono">{formatCurrency(selectedEOB.totalPatientResp)}</span>
              </div>
              <div className="summary-row" style={{ color: 'var(--text-tertiary)' }}>
                <span>Adjustments</span>
                <span className="mono">{formatCurrency(selectedEOB.totalAdjustment)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {toastVisible && (
        <div className="toast-container">
          <div className="toast">
            <Download size={14} style={{ color: 'var(--green)' }} />
            EOB PDF downloaded successfully
          </div>
        </div>
      )}

      <style jsx>{`
        .eob-page {
          max-width: 1200px;
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
        }
        .eob-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-lg);
        }
        .eob-header__actions {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }
        .eob-sync-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--border-hover);
          color: var(--text-primary);
        }
        .eob-filters {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-md);
        }
        .eob-table {
          width: 100%;
          border-collapse: collapse;
        }
        .eob-table th {
          text-align: left;
          padding: var(--space-md) var(--space-md);
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--border);
        }
        .eob-table td {
          padding: var(--space-md);
          font-size: var(--text-sm);
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }
        .eob-row {
          cursor: pointer;
          transition: background var(--transition-fast);
          animation: fadeIn var(--transition-base) ease both;
        }
        .eob-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .eob-row:last-child td {
          border-bottom: none;
        }
        .btn-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          color: var(--text-tertiary);
          transition: all var(--transition-fast);
        }
        .btn-icon:hover {
          background: rgba(255, 255, 255, 0.06);
          color: var(--accent);
        }
        .eob-detail__meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }
        .eob-detail__meta-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .eob-detail__meta-item .label {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .eob-detail__meta-item span:last-child {
          font-size: var(--text-sm);
          color: var(--text-primary);
        }
        .eob-detail__table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: var(--space-lg);
        }
        .eob-detail__table th {
          text-align: left;
          padding: var(--space-sm) var(--space-sm);
          font-size: 11px;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--border);
        }
        .eob-detail__table td {
          padding: var(--space-sm);
          font-size: var(--text-sm);
          border-bottom: 1px solid var(--border);
        }
        .eob-detail__summary {
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-md);
          padding: var(--space-md);
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
        .summary-row:last-child {
          border-top: 1px solid var(--border);
          padding-top: var(--space-sm);
          margin-top: var(--space-xs);
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
