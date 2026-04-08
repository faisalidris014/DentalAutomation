'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Role, User, Clinic } from '@/types';

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  currentUser: User;
  currentClinic: Clinic;
}

const mockUsers: Record<Role, User> = {
  it_admin: {
    id: 'user_1',
    name: 'Marcus Chen',
    email: 'marcus@niftybyte.io',
    role: 'it_admin',
    clinicId: 'clinic_1',
    initials: 'MC',
  },
  staff_admin: {
    id: 'user_3',
    name: 'Dr. Sarah Mitchell',
    email: 'sarah@brightsmiles.com',
    role: 'staff_admin',
    clinicId: 'clinic_1',
    initials: 'SM',
  },
  staff_user: {
    id: 'user_6',
    name: 'Jessica Torres',
    email: 'jessica@brightsmiles.com',
    role: 'staff_user',
    clinicId: 'clinic_1',
    initials: 'JT',
  },
};

const mockClinic: Clinic = {
  id: 'clinic_1',
  name: 'Bright Smiles Dental',
  address: '1234 Oak Valley Dr, Suite 200, Austin, TX 78704',
  phone: '5124567890',
  npi: '1234567890',
  agentId: 'agent_1',
  status: 'active',
  createdAt: '2025-06-15T00:00:00Z',
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('staff_admin');

  const setRole = useCallback((newRole: Role) => {
    setRoleState(newRole);
  }, []);

  const currentUser = mockUsers[role];
  const currentClinic = mockClinic;

  return (
    <RoleContext.Provider value={{ role, setRole, currentUser, currentClinic }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
