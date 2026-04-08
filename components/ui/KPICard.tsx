'use client';

import { type ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  accentColor?: string;
  mono?: boolean;
}

export function KPICard({
  label,
  value,
  delta,
  deltaType = 'neutral',
  icon,
  accentColor = 'var(--accent)',
  mono = true,
}: KPICardProps) {
  const deltaColors = {
    positive: 'var(--green)',
    negative: 'var(--red)',
    neutral: 'var(--text-tertiary)',
  };

  return (
    <div className="kpi-card">
      <div className="kpi-card__header">
        <span className="kpi-card__label">{label}</span>
        {icon && (
          <div className="kpi-card__icon" style={{ color: accentColor }}>
            {icon}
          </div>
        )}
      </div>
      <div className={`kpi-card__value ${mono ? 'mono' : ''}`}>{value}</div>
      {delta && (
        <div className="kpi-card__delta" style={{ color: deltaColors[deltaType] }}>
          {deltaType === 'positive' && '↑ '}
          {deltaType === 'negative' && '↓ '}
          {delta}
        </div>
      )}

      <style jsx>{`
        .kpi-card {
          background: var(--bg-glass);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          animation: fadeIn var(--transition-base) ease forwards;
          position: relative;
          overflow: hidden;
        }
        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: ${accentColor};
          opacity: 0.6;
        }
        .kpi-card__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-sm);
        }
        .kpi-card__label {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          font-weight: 500;
        }
        .kpi-card__icon {
          opacity: 0.7;
        }
        .kpi-card__value {
          font-size: var(--text-2xl);
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.2;
        }
        .kpi-card__delta {
          font-size: var(--text-xs);
          margin-top: var(--space-xs);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
