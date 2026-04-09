'use client';

import { useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  variant?: 'success' | 'error';
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, variant = 'success', visible, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [visible, onClose, duration]);

  if (!visible) return null;

  const Icon = variant === 'success' ? CheckCircle2 : XCircle;
  const color = variant === 'success' ? 'var(--green)' : 'var(--red)';

  return (
    <div className="toast-overlay">
      <div className="toast-box">
        <Icon size={16} style={{ color, flexShrink: 0 }} />
        <span>{message}</span>
      </div>

      <style jsx>{`
        .toast-overlay {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10000;
          animation: slideUp var(--transition-base) ease;
        }
        .toast-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: var(--bg-elevated);
          border: 1px solid ${color}33;
          border-radius: var(--radius-lg);
          font-size: var(--text-sm);
          color: var(--text-primary);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
