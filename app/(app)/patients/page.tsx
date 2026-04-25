'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { SearchBar } from '@/components/ui/SearchBar';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRole } from '@/context/RoleContext';
import { api } from '@/lib/api';
import { mapApiPatientToPatient } from '@/lib/adapters';
import { formatCurrency, formatDate, getInitials } from '@/lib/formatters';
import type { Patient } from '@/types';
import type { PaginatedResponse, ApiPatient } from '@/types/api';

const recallVariant = (status: string) => {
  switch (status) {
    case 'current':
    case 'scheduled':
      return 'green' as const;
    case 'due':
      return 'amber' as const;
    case 'overdue':
      return 'red' as const;
    default:
      return 'default' as const;
  }
};

export default function PatientsPage() {
  const router = useRouter();
  const { currentClinic } = useRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const debounce = setTimeout(() => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ limit: '100' });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      api.get<PaginatedResponse<ApiPatient>>(`/api/patients?${params}`)
        .then(res => {
          if (!cancelled) {
            setPatients(res.data.map(mapApiPatientToPatient));
            setLoading(false);
          }
        })
        .catch(err => {
          if (!cancelled) {
            setError(err.message || 'Failed to load patients');
            setLoading(false);
          }
        });
    }, searchQuery ? 300 : 0);
    return () => { cancelled = true; clearTimeout(debounce); };
  }, [searchQuery]);

  const filtered = patients;

  return (
    <div className="patients-page">
      <header className="patients-header">
        <div className="patients-title-row">
          <Users size={24} />
          <h1 className="patients-title">Patient Lookup</h1>
        </div>
        <p className="patients-subtitle">
          {loading
            ? 'Loading patients...'
            : `${filtered.length} patient${filtered.length !== 1 ? 's' : ''} found`}
        </p>
      </header>

      <div className="patients-search">
        <SearchBar
          placeholder="Search patients by name..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {loading ? (
        <div className="patients-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`skeleton-card stagger-${i + 1}`}>
              <div className="skeleton-avatar skeleton" />
              <div className="skeleton-lines">
                <div className="skeleton skeleton-line-lg" />
                <div className="skeleton skeleton-line-sm" />
                <div className="skeleton skeleton-line-sm" />
                <div className="skeleton skeleton-line-md" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users size={40} />}
            title="No patients found"
            description={
              searchQuery
                ? `No results for "${searchQuery}". Try a different name.`
                : 'No patient records available.'
            }
          />
        </Card>
      ) : (
        <div className="patients-grid">
          {filtered.map((patient, i) => {
            const fullName = `${patient.firstName} ${patient.lastName}`;
            const carrier = patient.primaryInsurance?.carrierName;
            const addressStr =
              typeof patient.address === 'string'
                ? patient.address
                : patient.address
                ? `${(patient.address as { city: string; state: string }).city}, ${(patient.address as { city: string; state: string }).state}`
                : '';
            return (
              <div
                key={patient.id}
                style={{ opacity: 0, animation: `fadeIn 250ms ease ${(i % 8) * 60}ms forwards` }}
              >
                <Card
                  hoverable
                  onClick={() => router.push(`/patients/${patient.id}`)}
                >
                  <div className="patient-card">
                    <div className="patient-card__top">
                      <Avatar initials={getInitials(fullName)} size={42} />
                      <div className="patient-card__info">
                        <span className="patient-card__name">{fullName}</span>
                        <span className="patient-card__dob mono">
                          DOB: {formatDate(patient.dob)}
                        </span>
                      </div>
                    </div>

                    <div className="patient-card__details">
                      <div className="patient-card__row">
                        <span className="patient-card__label">Phone</span>
                        <span className="patient-card__value mono">{patient.phone}</span>
                      </div>
                      <div className="patient-card__row">
                        <span className="patient-card__label">Insurance</span>
                        <span
                          className="patient-card__value"
                          style={!carrier ? { color: 'var(--red)' } : undefined}
                        >
                          {carrier || 'No Insurance'}
                        </span>
                      </div>
                      <div className="patient-card__row">
                        <span className="patient-card__label">Balance</span>
                        <span
                          className="patient-card__value mono"
                          style={patient.balance > 0 ? { color: 'var(--amber)' } : undefined}
                        >
                          {formatCurrency(patient.balance)}
                        </span>
                      </div>
                    </div>

                    <div className="patient-card__footer">
                      <Badge variant={recallVariant(patient.recallStatus)} dot>
                        {patient.recallStatus.charAt(0).toUpperCase() +
                          patient.recallStatus.slice(1)}
                      </Badge>
                      {addressStr && (
                        <span className="patient-card__location">{addressStr}</span>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .patients-page {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
          animation: fadeIn var(--transition-base) forwards;
        }
        .patients-header {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        .patients-title-row {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          color: var(--accent);
        }
        .patients-title {
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--text-primary);
        }
        .patients-subtitle {
          font-size: var(--text-sm);
          color: var(--text-tertiary);
        }
        .patients-search {
          max-width: 480px;
        }
        .patients-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: var(--space-lg);
        }
        .patient-card {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .patient-card__top {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }
        .patient-card__info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .patient-card__name {
          font-size: var(--text-md);
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .patient-card__dob {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
        .patient-card__details {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          padding-top: var(--space-sm);
          border-top: 1px solid var(--border);
        }
        .patient-card__row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .patient-card__label {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .patient-card__value {
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
        .patient-card__footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: var(--space-sm);
          border-top: 1px solid var(--border);
        }
        .patient-card__location {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }

        /* Skeleton loading */
        .skeleton-card {
          background: var(--bg-glass);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          display: flex;
          gap: var(--space-md);
          opacity: 0;
          animation: fadeIn var(--transition-base) forwards;
        }
        .skeleton-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .skeleton-lines {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        .skeleton-line-lg {
          height: 14px;
          width: 60%;
          border-radius: var(--radius-sm);
        }
        .skeleton-line-md {
          height: 12px;
          width: 45%;
          border-radius: var(--radius-sm);
        }
        .skeleton-line-sm {
          height: 10px;
          width: 70%;
          border-radius: var(--radius-sm);
        }
        .skeleton {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.04) 25%,
            rgba(255, 255, 255, 0.08) 50%,
            rgba(255, 255, 255, 0.04) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s ease infinite;
        }
      `}</style>
    </div>
  );
}
