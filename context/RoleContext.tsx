'use client';

// Re-exports from AuthContext for backwards compatibility.
// All existing imports of useRole from '@/context/RoleContext' continue to work.
export { AuthProvider as RoleProvider, useRole } from './AuthContext';
