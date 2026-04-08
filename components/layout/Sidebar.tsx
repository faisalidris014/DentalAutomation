'use client';

import { useState, useEffect } from 'react';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { StatusDot } from '@/components/ui/StatusDot';
import type { Clinic } from '@/types';

const mockClinics: (Clinic & { agentStatus: 'online' | 'offline' | 'updating' })[] = [
  {
    id: 'clinic_1', name: 'Bright Smiles Dental', address: '1234 Oak Valley Dr, Austin, TX',
    phone: '5124567890', npi: '1234567890', agentId: 'agent_1', status: 'active', createdAt: '2025-06-15',
    agentStatus: 'online',
  },
  {
    id: 'clinic_2', name: 'Lakewood Family Dentistry', address: '567 Lakewood Blvd, Austin, TX',
    phone: '5129876543', npi: '0987654321', agentId: 'agent_2', status: 'active', createdAt: '2025-08-01',
    agentStatus: 'online',
  },
  {
    id: 'clinic_3', name: 'North Star Dental Group', address: '890 North Star Way, Austin, TX',
    phone: '5125551234', npi: '1122334455', agentId: 'agent_3', status: 'active', createdAt: '2025-09-20',
    agentStatus: 'offline',
  },
];

export function Sidebar() {
  const { role } = useRole();
  const [collapsed, setCollapsed] = useState(false);

  if (role !== 'it_admin') return null;

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__header">
        {!collapsed && (
          <>
            <Building2 size={16} style={{ color: 'var(--text-tertiary)' }} />
            <span className="sidebar__title">Clinics</span>
          </>
        )}
        <button className="sidebar__toggle" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {!collapsed && (
        <div className="sidebar__list">
          {mockClinics.map(clinic => (
            <div key={clinic.id} className="sidebar__clinic">
              <div className="sidebar__clinic-info">
                <span className="sidebar__clinic-name">{clinic.name}</span>
                <span className="sidebar__clinic-addr">{clinic.address}</span>
              </div>
              <StatusDot
                variant={clinic.agentStatus === 'online' ? 'green' : clinic.agentStatus === 'updating' ? 'amber' : 'red'}
                size={6}
              />
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .sidebar {
          width: var(--sidebar-width);
          background: var(--bg-deep);
          border-right: 1px solid var(--border);
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          transition: width var(--transition-base);
          overflow: hidden;
        }
        .sidebar--collapsed {
          width: 48px;
        }
        .sidebar__header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-md);
          border-bottom: 1px solid var(--border);
        }
        .sidebar__title {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-secondary);
          flex: 1;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-size: var(--text-xs);
        }
        .sidebar__toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: var(--radius-sm);
          color: var(--text-tertiary);
          margin-left: auto;
          transition: all var(--transition-fast);
        }
        .sidebar__toggle:hover {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-secondary);
        }
        .sidebar__list {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-sm);
        }
        .sidebar__clinic {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--radius-sm);
          transition: background var(--transition-fast);
          cursor: pointer;
        }
        .sidebar__clinic:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .sidebar__clinic-info {
          flex: 1;
          min-width: 0;
        }
        .sidebar__clinic-name {
          display: block;
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar__clinic-addr {
          display: block;
          font-size: var(--text-xs);
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </aside>
  );
}
