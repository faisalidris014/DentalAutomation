import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-cookies';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has(ACCESS_TOKEN_COOKIE);

  // Authenticated user on login page → redirect to dashboard
  if (pathname === '/login' && hasToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Unauthenticated user on protected route → redirect to login
  if (pathname !== '/login' && !hasToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except API, static assets, and favicon
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
