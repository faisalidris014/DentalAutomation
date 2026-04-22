'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      let x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
      let y = position === 'top'
        ? triggerRect.top - tooltipRect.height - 8
        : triggerRect.bottom + 8;

      // Keep within viewport
      if (x < 8) x = 8;
      if (x + tooltipRect.width > window.innerWidth - 8) {
        x = window.innerWidth - tooltipRect.width - 8;
      }

      setCoords({ x, y });
    }
  }, [visible, position]);

  return (
    <div
      ref={triggerRef}
      className="tooltip-trigger"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          ref={tooltipRef}
          className="tooltip-bubble"
          style={{ position: 'fixed', left: coords.x, top: coords.y }}
        >
          {content}
        </div>
      )}

      <style jsx>{`
        .tooltip-trigger {
          position: relative;
          display: grid;
        }
        .tooltip-bubble {
          z-index: 9999;
          max-width: 280px;
          padding: 8px 12px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-hover);
          border-radius: var(--radius-md);
          font-size: var(--text-xs);
          color: var(--text-secondary);
          line-height: 1.5;
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          pointer-events: none;
          animation: fadeIn 150ms ease;
          white-space: normal;
        }
      `}</style>
    </div>
  );
}
