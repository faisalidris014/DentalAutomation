'use client';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  animated?: boolean;
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  color = 'var(--accent)',
  height = 6,
  animated = false,
  showLabel = false,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="progress-wrapper">
      <div className="progress-track" style={{ height }}>
        <div
          className={`progress-fill ${animated ? 'progress-fill--animated' : ''}`}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {showLabel && <span className="progress-label mono">{Math.round(pct)}%</span>}

      <style jsx>{`
        .progress-wrapper {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        .progress-track {
          flex: 1;
          background: rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.6s ease;
        }
        .progress-fill--animated {
          background-image: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.1) 25%,
            transparent 25%,
            transparent 50%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(255, 255, 255, 0.1) 75%,
            transparent 75%
          );
          background-size: 40px 40px;
          animation: progressStripe 1s linear infinite;
        }
        .progress-label {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          min-width: 36px;
          text-align: right;
        }
      `}</style>
    </div>
  );
}
