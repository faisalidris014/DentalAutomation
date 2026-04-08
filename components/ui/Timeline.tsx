'use client';

import { type ReactNode } from 'react';

interface TimelineItem {
  id: string;
  timestamp: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  color?: string;
  status?: 'success' | 'info' | 'warning' | 'error';
}

interface TimelineProps {
  items: TimelineItem[];
}

const statusColors: Record<string, string> = {
  success: 'var(--green)',
  info: 'var(--accent)',
  warning: 'var(--amber)',
  error: 'var(--red)',
};

export function Timeline({ items }: TimelineProps) {
  return (
    <div className="timeline">
      {items.map((item, i) => {
        const color = item.color || statusColors[item.status || 'info'];
        return (
          <div key={item.id} className="timeline-item">
            <div className="timeline-line-area">
              <div className="timeline-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
              {i < items.length - 1 && <div className="timeline-line" />}
            </div>
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-title">{item.title}</span>
                <span className="timeline-time mono">{item.timestamp}</span>
              </div>
              {item.description && (
                <p className="timeline-desc">{item.description}</p>
              )}
            </div>
          </div>
        );
      })}

      <style jsx>{`
        .timeline {
          display: flex;
          flex-direction: column;
        }
        .timeline-item {
          display: flex;
          gap: var(--space-md);
          animation: fadeIn var(--transition-base) ease forwards;
        }
        .timeline-line-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          width: 16px;
          padding-top: 4px;
        }
        .timeline-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .timeline-line {
          width: 1px;
          flex: 1;
          background: var(--border);
          margin: 4px 0;
          min-height: 20px;
        }
        .timeline-content {
          flex: 1;
          padding-bottom: var(--space-md);
        }
        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-sm);
        }
        .timeline-title {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-primary);
        }
        .timeline-time {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          flex-shrink: 0;
        }
        .timeline-desc {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          margin-top: 2px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
