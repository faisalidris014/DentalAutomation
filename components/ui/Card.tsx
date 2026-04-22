'use client';

import { type ReactNode, type CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  accentColor?: string;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  hoverable?: boolean;
  padding?: string;
}

export function Card({
  children,
  accentColor,
  className = '',
  style,
  onClick,
  hoverable = false,
  padding = 'var(--space-lg)',
}: CardProps) {
  return (
    <div
      className={`df-card ${hoverable ? 'df-card--hoverable' : ''} ${className}`}
      style={{
        ...style,
        '--card-accent': accentColor || 'transparent',
        '--card-padding': padding,
      } as CSSProperties}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {accentColor && <div className="df-card__accent" />}
      {children}

      <style jsx>{`
        .df-card {
          background: var(--bg-glass);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--card-padding);
          position: relative;
          overflow: visible;
          animation: fadeIn var(--transition-base) forwards;
        }
        .df-card--hoverable {
          cursor: pointer;
          transition: background var(--transition-fast),
            border-color var(--transition-fast),
            box-shadow var(--transition-fast),
            transform var(--transition-fast);
        }
        .df-card--hoverable:hover {
          background: var(--bg-glass-hover);
          border-color: var(--border-hover);
          box-shadow: var(--shadow-md);
          transform: translateY(-1px);
        }
        .df-card__accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--card-accent);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        }
      `}</style>
    </div>
  );
}
