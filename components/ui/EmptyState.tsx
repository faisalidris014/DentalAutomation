'use client';

import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__desc">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}

      <style jsx>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-2xl) var(--space-lg);
          text-align: center;
        }
        .empty-state__icon {
          color: var(--text-muted);
          margin-bottom: var(--space-md);
          opacity: 0.5;
        }
        .empty-state__title {
          font-size: var(--text-md);
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: var(--space-xs);
        }
        .empty-state__desc {
          font-size: var(--text-sm);
          color: var(--text-tertiary);
          max-width: 320px;
          line-height: 1.5;
        }
        .empty-state__action {
          margin-top: var(--space-md);
        }
      `}</style>
    </div>
  );
}
