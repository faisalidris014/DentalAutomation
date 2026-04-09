'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, ShieldCheck, CalendarClock,
  FileText, FileSpreadsheet, Zap, HardDrive, Settings, Bell, Activity,
  Menu, X
} from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { RoleSwitcher } from './RoleSwitcher';
import { AlertsDropdown } from './AlertsDropdown';
import { Avatar } from '@/components/ui/Avatar';
import { StatusDot } from '@/components/ui/StatusDot';
import { NavPill } from '@/components/ui/NavPill';

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: ('it_admin' | 'staff_admin' | 'staff_user')[];
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['it_admin', 'staff_admin', 'staff_user'] },
  { path: '/patients', label: 'Patients', icon: Users, roles: ['it_admin', 'staff_admin', 'staff_user'] },
  { path: '/eligibility', label: 'Eligibility', icon: ShieldCheck, roles: ['staff_admin', 'staff_user'] },
  { path: '/recalls', label: 'Recalls', icon: CalendarClock, roles: ['staff_admin', 'staff_user'] },
  { path: '/claims', label: 'Claims', icon: FileText, roles: ['staff_admin', 'staff_user'] },
  { path: '/eob', label: 'EOB', icon: FileSpreadsheet, roles: ['staff_admin'] },
  { path: '/automations', label: 'Automations', icon: Zap, roles: ['it_admin', 'staff_admin'] },
  { path: '/agents', label: 'Agents', icon: HardDrive, roles: ['it_admin'] },
  { path: '/settings', label: 'Settings', icon: Settings, roles: ['it_admin', 'staff_admin'] },
];

interface TopNavProps {
  unreadCount?: number;
}

export function TopNav({ unreadCount = 0 }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, currentUser } = useRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const visibleItems = navItems.filter(item => item.roles.includes(role));

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close on click outside
  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileMenuOpen]);

  return (
    <div ref={menuRef}>
      <nav className="topnav">
        <div className="topnav__left">
          <button
            className="topnav__hamburger"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="topnav__brand" onClick={() => router.push('/dashboard')}>
            <Activity size={22} style={{ color: 'var(--accent)' }} />
            <div className="topnav__brand-text">
              <span className="topnav__brand-name">DentalFlow</span>
              <span className="topnav__brand-sub">by NiftyByte</span>
            </div>
          </div>

          <div className="topnav__pills">
            {visibleItems.map(item => {
              const Icon = item.icon;
              return (
                <NavPill
                  key={item.path}
                  active={pathname === item.path || pathname.startsWith(item.path + '/')}
                  onClick={() => router.push(item.path)}
                  icon={<Icon size={15} />}
                  badge={item.path === '/notifications' ? unreadCount : undefined}
                >
                  {item.label}
                </NavPill>
              );
            })}
          </div>
        </div>

        <div className="topnav__right">
          <div className="topnav__api-status">
            <StatusDot variant="green" size={6} />
            <span className="topnav__api-label mono">API Connected</span>
          </div>

          {(role === 'staff_admin' || role === 'staff_user') && (
            <AlertsDropdown
              unreadCount={unreadCount}
              isActive={pathname === '/notifications'}
              onNavigate={() => router.push('/notifications')}
            />
          )}

          <RoleSwitcher />

          <Avatar initials={currentUser.initials} size={32} />
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="topnav__mobile-menu">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                className={`topnav__mobile-item ${isActive ? 'topnav__mobile-item--active' : ''}`}
                onClick={() => {
                  router.push(item.path);
                  setMobileMenuOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .topnav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: var(--nav-height);
          padding: 0 var(--space-lg);
          background: var(--bg-deep);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 500;
          flex-shrink: 0;
        }
        .topnav__left {
          display: flex;
          align-items: center;
          gap: var(--space-xl);
        }
        .topnav__hamburger {
          display: none;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .topnav__hamburger:hover {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-primary);
        }
        .topnav__brand {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          cursor: pointer;
          flex-shrink: 0;
        }
        .topnav__brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }
        .topnav__brand-name {
          font-size: var(--text-md);
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }
        .topnav__brand-sub {
          font-size: 9px;
          color: var(--text-muted);
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .topnav__pills {
          display: flex;
          align-items: center;
          gap: 2px;
          overflow-x: auto;
        }
        .topnav__pills::-webkit-scrollbar {
          display: none;
        }
        .topnav__right {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          flex-shrink: 0;
        }
        .topnav__api-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          background: var(--green-dim);
          border: 1px solid rgba(52, 211, 153, 0.12);
        }
        .topnav__api-label {
          font-size: 10px;
          color: var(--green);
          font-weight: 500;
        }
        .topnav__mobile-menu {
          display: none;
          position: absolute;
          top: var(--nav-height);
          left: 0;
          right: 0;
          background: var(--bg-deep);
          border-bottom: 1px solid var(--border);
          z-index: 499;
          padding: var(--space-sm);
          flex-direction: column;
          gap: 2px;
          animation: fadeIn 200ms ease forwards;
          box-shadow: var(--shadow-lg);
        }
        .topnav__mobile-item {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          width: 100%;
          padding: var(--space-md) var(--space-lg);
          border-radius: var(--radius-sm);
          font-size: var(--text-base);
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .topnav__mobile-item:hover {
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-primary);
        }
        .topnav__mobile-item--active {
          background: var(--accent-dim);
          color: var(--accent-text);
        }

        /* Hide API status on small screens */
        @media (max-width: 640px) {
          .topnav__api-status {
            display: none;
          }
        }

        /* Mobile nav: hamburger + mobile menu */
        @media (max-width: 768px) {
          .topnav__hamburger {
            display: flex;
          }
          .topnav__pills {
            display: none;
          }
          .topnav__brand-sub {
            display: none;
          }
          .topnav__mobile-menu {
            display: flex;
          }
          .topnav__left {
            gap: var(--space-md);
          }
        }
      `}</style>
    </div>
  );
}
