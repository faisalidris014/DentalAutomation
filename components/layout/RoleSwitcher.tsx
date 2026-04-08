'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Shield, UserCog, User } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import type { Role } from '@/types';

const roleConfig: Record<Role, { label: string; icon: typeof Shield; color: string }> = {
  it_admin: { label: 'IT Admin', icon: Shield, color: 'var(--purple)' },
  staff_admin: { label: 'Staff Admin', icon: UserCog, color: 'var(--accent)' },
  staff_user: { label: 'Staff User', icon: User, color: 'var(--green)' },
};

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = roleConfig[role];
  const Icon = current.icon;

  return (
    <div className="role-switcher" ref={ref}>
      <button className="role-switcher__trigger" onClick={() => setOpen(!open)}>
        <Icon size={14} style={{ color: current.color }} />
        <span>{current.label}</span>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div className="role-switcher__dropdown">
          <div className="role-switcher__header">Switch Role</div>
          {(Object.keys(roleConfig) as Role[]).map(r => {
            const cfg = roleConfig[r];
            const RIcon = cfg.icon;
            return (
              <button
                key={r}
                className={`role-switcher__option ${r === role ? 'role-switcher__option--active' : ''}`}
                onClick={() => { setRole(r); setOpen(false); }}
              >
                <RIcon size={14} style={{ color: cfg.color }} />
                <span>{cfg.label}</span>
                {r === role && <span className="role-switcher__check">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .role-switcher {
          position: relative;
        }
        .role-switcher__trigger {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.03);
          transition: all var(--transition-fast);
        }
        .role-switcher__trigger:hover {
          border-color: var(--border-hover);
          background: rgba(255, 255, 255, 0.06);
        }
        .role-switcher__dropdown {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          min-width: 180px;
          z-index: 200;
          overflow: hidden;
          animation: fadeIn 0.12s ease;
        }
        .role-switcher__header {
          padding: 8px 14px;
          font-size: var(--text-xs);
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border);
        }
        .role-switcher__option {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 14px;
          font-size: var(--text-sm);
          color: var(--text-secondary);
          text-align: left;
          transition: background var(--transition-fast);
        }
        .role-switcher__option:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .role-switcher__option--active {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.03);
        }
        .role-switcher__check {
          margin-left: auto;
          color: var(--accent);
          font-size: var(--text-xs);
        }
      `}</style>
    </div>
  );
}
