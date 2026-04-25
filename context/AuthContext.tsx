'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { mapApiUserToUser, mapApiClinicToClinic } from '@/lib/adapters';
import type { Role, User, Clinic } from '@/types';
import type { LoginResponse, MeResponse } from '@/types/api';

// ─── Types ─────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  clinic: Clinic | null;
  role: Role;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Backwards-compat shape matching old RoleContext
interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  currentUser: User;
  currentClinic: Clinic;
}

// ─── Fallback values for unauthenticated state ─────────────────────────────

const fallbackUser: User = {
  id: '',
  name: 'Guest',
  email: '',
  role: 'staff_user',
  clinicId: '',
  initials: 'G',
};

const fallbackClinic: Clinic = {
  id: '',
  name: '',
  address: '',
  phone: '',
  npi: '',
  agentId: '',
  status: 'inactive',
  createdAt: '',
};

// ─── Context ───────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const didInit = useRef(false);

  // Hydrate session on mount — cookie is sent automatically
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    api.get<MeResponse>('/api/auth/me')
      .then((res) => {
        const u = res.user;
        setUser(mapApiUserToUser(u));
        setClinic(u.clinic ? mapApiClinicToClinic(u.clinic) : null);
      })
      .catch(() => {
        // Not authenticated — proxy.ts handles redirect
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Listen for forced logout from api.ts (refresh failure)
  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      setClinic(null);
      router.push('/login');
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [router]);

  const login = useCallback(async (email: string, password: string) => {
    await api.post<LoginResponse>('/api/auth/login', { email, password });

    // Fetch full user + clinic data (cookies now set by login response)
    const me = await api.get<MeResponse>('/api/auth/me');
    setUser(mapApiUserToUser(me.user));
    setClinic(me.user.clinic ? mapApiClinicToClinic(me.user.clinic) : null);

    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout', {}).catch(() => {});
    } catch {
      // Best-effort logout
    }
    setUser(null);
    setClinic(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        clinic,
        role: (user?.role as Role) ?? 'staff_user',
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Backwards-compatible shim for useRole().
 * Returns the same shape as the old RoleContext so unwired pages keep working.
 */
export function useRole(): RoleContextValue {
  const { user, clinic, role } = useAuth();
  return {
    role,
    setRole: () => {},
    currentUser: user ?? fallbackUser,
    currentClinic: clinic ?? fallbackClinic,
  };
}
