'use client';

type StatusDotVariant = 'green' | 'amber' | 'red' | 'cyan';

interface StatusDotProps {
  variant?: StatusDotVariant;
  pulse?: boolean;
  size?: number;
  label?: string;
}

const colorMap: Record<StatusDotVariant, string> = {
  green: 'var(--green)',
  amber: 'var(--amber)',
  red: 'var(--red)',
  cyan: 'var(--accent)',
};

export function StatusDot({ variant = 'green', pulse = true, size = 8, label }: StatusDotProps) {
  return (
    <span className="status-dot-wrapper">
      <span
        className={`status-dot ${pulse ? 'status-dot--pulse' : ''}`}
        style={{
          width: size,
          height: size,
          background: colorMap[variant],
          boxShadow: `0 0 ${size}px ${colorMap[variant]}`,
        }}
      />
      {label && <span className="status-dot__label">{label}</span>}

      <style jsx>{`
        .status-dot-wrapper {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .status-dot {
          border-radius: 50%;
          flex-shrink: 0;
          display: inline-block;
        }
        .status-dot--pulse {
          animation: pulseGlow 2s ease-in-out infinite;
        }
        .status-dot__label {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          font-weight: 500;
        }
      `}</style>
    </span>
  );
}
