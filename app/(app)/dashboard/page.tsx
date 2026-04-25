'use client';

import { useRole } from '@/context/RoleContext';
import { ITAdminDashboard } from '@/components/screens/dashboard/ITAdminDashboard';
import { StaffAdminDashboard } from '@/components/screens/dashboard/StaffAdminDashboard';
import { StaffUserDashboard } from '@/components/screens/dashboard/StaffUserDashboard';

export default function DashboardPage() {
  const { role } = useRole();

  switch (role) {
    case 'it_admin':
      return <ITAdminDashboard />;
    case 'staff_admin':
      return <StaffAdminDashboard />;
    case 'staff_user':
      return <StaffUserDashboard />;
    default:
      return <StaffUserDashboard />;
  }
}
