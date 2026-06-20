import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_NAME = process.env.COOKIE_NAME || 'anteraja_session';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(COOKIE_NAME);

  // Already on /login — redirect authenticated users to home
  if (pathname === '/login') {
    if (hasSession) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Any other page — redirect unauthenticated users to /login
  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

/**
 * Match all routes except API endpoints, Next.js internals, and static assets.
 */
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo-anteraja.png).*)'],
};
