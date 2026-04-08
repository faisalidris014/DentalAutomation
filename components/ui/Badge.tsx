'use client';

import { type ReactNode } from 'react';

type BadgeVariant = 'cyan' | 'green' | 'amber' | 'red' | 'purple' | 'default';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  cyan: { bg: 'var(--accent-dim)', color: 'var(--accent-text)', border: 'rgba(34, 211, 238, 0.2)' },
  green: { bg: 'var(--green-dim)', color: 'var(--green)', border: 'rgba(52, 211, 153, 0.2)' },
  amber: { bg: 'var(--amber-dim)', color: 'var(--amber)', border: 'rgba(251, 191, 36, 0.2)' },
  red: { bg: 'var(--red-dim)', color: 'var(--red)', border: 'rgba(248, 113, 113, 0.2)' },
  purple: { bg: 'var(--purple-dim)', color: 'var(--purple)', border: 'rgba(167, 139, 250, 0.2)' },
  default: { bg: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-secondary)', border: 'rgba(148, 163, 184, 0.15)' },
};

export function Badge({ children, variant = 'default', size = 'sm', dot = false }: BadgeProps) {
  const s = variantStyles[variant];
  return (
    <span
      className="df-badge"
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        fontSize: size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)',
        padding: size === 'sm' ? '2px 8px' : '4px 12px',
      }}
    >
      {dot && <span className="df-badge__dot" style={{ background: s.color }} />}
      {children}

      <style jsx>{`
        .df-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
          border-radius: var(--radius-full);
          white-space: nowrap;
          line-height: 1.4;
          letter-spacing: 0.01em;
        }
        .df-badge__dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
      `}</style>
    </span>
  );
}
