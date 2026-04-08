'use client';

import { type ReactNode } from 'react';

interface NavPillProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  badge?: number;
}

export function NavPill({ children, active = false, onClick, icon, badge }: NavPillProps) {
  return (
    <button
      className={`nav-pill ${active ? 'nav-pill--active' : ''}`}
      onClick={onClick}
    >
      {icon && <span className="nav-pill__icon">{icon}</span>}
      <span>{children}</span>
      {badge !== undefined && badge > 0 && (
        <span className="nav-pill__badge">{badge > 99 ? '99+' : badge}</span>
      )}

      <style jsx>{`
        .nav-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
          background: transparent;
          border: 1px solid transparent;
          transition: all var(--transition-fast);
          white-space: nowrap;
          position: relative;
        }
        .nav-pill:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-pill--active {
          color: var(--accent-text);
          background: var(--accent-dim);
          border-color: rgba(34, 211, 238, 0.15);
        }
        .nav-pill__icon {
          display: flex;
          align-items: center;
        }
        .nav-pill__badge {
          background: var(--red);
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 1px 5px;
          border-radius: var(--radius-full);
          min-width: 16px;
          text-align: center;
          line-height: 1.4;
        }
      `}</style>
    </button>
  );
}
