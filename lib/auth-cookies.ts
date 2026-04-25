// Shared cookie name constants and options for auth tokens.
// This module must remain edge-safe (no Node.js imports, no DB access).

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export function accessTokenCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 15 * 60, // 15 minutes — matches JWT expiry
  };
}

export function refreshTokenCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/api/auth', // only sent to auth endpoints
    maxAge: 7 * 24 * 60 * 60, // 7 days — matches refresh token expiry
  };
}
