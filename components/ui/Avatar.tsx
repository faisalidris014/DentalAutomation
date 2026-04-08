'use client';

interface AvatarProps {
  initials: string;
  size?: number;
  color?: string;
}

const palette = [
  '#22d3ee', '#34d399', '#a78bfa', '#fbbf24', '#f87171',
  '#818cf8', '#fb923c', '#e879f9', '#2dd4bf', '#f472b6',
];

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

export function Avatar({ initials, size = 36, color }: AvatarProps) {
  const bg = color || hashColor(initials);
  return (
    <div
      className="df-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `${bg}20`,
        color: bg,
        border: `1.5px solid ${bg}40`,
      }}
    >
      {initials}

      <style jsx>{`
        .df-avatar {
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-family: var(--font-ui);
          letter-spacing: 0.02em;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
