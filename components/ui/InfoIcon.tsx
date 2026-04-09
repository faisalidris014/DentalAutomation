'use client';

import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface InfoIconProps {
  text: string;
}

export function InfoIcon({ text }: InfoIconProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="info-icon-wrap">
      <button
        className="info-icon-btn"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        title="More info"
      >
        <Info size={13} />
      </button>
      {open && (
        <div className="info-popover">
          {text}
        </div>
      )}

      <style jsx>{`
        .info-icon-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .info-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          color: var(--text-muted);
          transition: all var(--transition-fast);
          cursor: pointer;
          margin-left: 4px;
          flex-shrink: 0;
        }
        .info-icon-btn:hover {
          color: var(--accent-text);
          background: rgba(34, 211, 238, 0.1);
        }
        .info-popover {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          width: 240px;
          padding: 10px 14px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-hover);
          border-radius: var(--radius-md);
          font-size: var(--text-xs);
          color: var(--text-secondary);
          line-height: 1.6;
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          animation: fadeIn 150ms ease;
          white-space: normal;
          text-transform: none;
          letter-spacing: normal;
          font-weight: 400;
        }
      `}</style>
    </div>
  );
}
