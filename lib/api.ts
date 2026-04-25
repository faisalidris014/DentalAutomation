// Central API client with JWT auth header injection and transparent token refresh.
// Tokens are stored in module-scoped variables (memory only, not localStorage).

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Token Storage (module-scoped, memory only) ────────────────────────────

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

// ─── Refresh Lock (prevents concurrent refresh requests) ───────────────────

let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (!refreshToken) return false;

  // If a refresh is already in flight, wait for it
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        clearTokens();
        return false;
      }

      const data = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      clearTokens();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── Core Fetch Wrapper ────────────────────────────────────────────────────

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, skipAuth, ...init } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  if (!skipAuth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(path, {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // On 401, attempt token refresh and retry once
  if (res.status === 401 && !skipAuth && refreshToken) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(path, {
        ...init,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } else {
      // Refresh failed — signal logout to React layer
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:logout'));
      }
      throw new ApiError('Session expired', 401, 'SESSION_EXPIRED');
    }
  }

  // Still 401 after retry
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:logout'));
    }
    throw new ApiError('Unauthorized', 401, 'AUTHENTICATION_ERROR');
  }

  const json = await res.json();

  if (!res.ok) {
    throw new ApiError(
      json.error || 'Request failed',
      res.status,
      json.code || 'UNKNOWN_ERROR',
      json.fieldErrors,
    );
  }

  return json as T;
}

// ─── Convenience Methods ───────────────────────────────────────────────────

export const api = {
  get<T>(path: string, options?: Omit<FetchOptions, 'method' | 'body'>) {
    return apiFetch<T>(path, { ...options, method: 'GET' });
  },

  post<T>(path: string, body?: unknown, options?: Omit<FetchOptions, 'method' | 'body'>) {
    return apiFetch<T>(path, { ...options, method: 'POST', body });
  },

  put<T>(path: string, body?: unknown, options?: Omit<FetchOptions, 'method' | 'body'>) {
    return apiFetch<T>(path, { ...options, method: 'PUT', body });
  },

  delete<T>(path: string, options?: Omit<FetchOptions, 'method' | 'body'>) {
    return apiFetch<T>(path, { ...options, method: 'DELETE' });
  },
};
