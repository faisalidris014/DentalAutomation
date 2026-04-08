'use client';

import { type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface DataRowProps {
  children: ReactNode;
  onClick?: () => void;
  showArrow?: boolean;
  className?: string;
}

export function DataRow({ children, onClick, showArrow = true, className = '' }: DataRowProps) {
  return (
    <div
      className={`data-row ${onClick ? 'data-row--clickable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="data-row__content">{children}</div>
      {onClick && showArrow && (
        <ChevronRight size={16} className="data-row__arrow" />
      )}

      <style jsx>{`
        .data-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-md) var(--space-lg);
          border-bottom: 1px solid var(--border);
          transition: background var(--transition-fast);
        }
        .data-row:last-child {
          border-bottom: none;
        }
        .data-row--clickable {
          cursor: pointer;
        }
        .data-row--clickable:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .data-row__content {
          flex: 1;
          display: flex;
          align-items: center;
          gap: var(--space-md);
          min-width: 0;
        }
      `}</style>
      <style jsx global>{`
        .data-row__arrow {
          color: var(--text-muted);
          flex-shrink: 0;
          transition: color 0.15s ease, transform 0.15s ease;
        }
        .data-row--clickable:hover .data-row__arrow {
          color: var(--text-secondary);
          transform: translateX(2px);
        }
      `}</style>
    </div>
  );
}
