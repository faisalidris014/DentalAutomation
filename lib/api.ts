// Central API client with cookie-based auth and transparent token refresh.
// Tokens are stored as HttpOnly cookies set by the auth API routes.
// The browser sends them automatically on same-origin requests.

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

// ─── Refresh Lock (prevents concurrent refresh requests) ───────────────────

let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      return res.ok;
    } catch {
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
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, ...init } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  let res = await fetch(path, {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // On 401, attempt token refresh and retry once
  if (res.status === 401) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
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
