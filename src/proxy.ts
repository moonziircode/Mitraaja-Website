import { NextResponse, type NextRequest } from 'next/server';

const ACTIVE_COOKIE_NAME = 'mitraaja_session_v2';
const OLD_COOKIES = ['mitraaja_session', 'anteraja_session'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasValidSession = request.cookies.has(ACTIVE_COOKIE_NAME);

  // Already on /login — redirect authenticated users to home
  if (pathname === '/login') {
    if (hasValidSession) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    const response = NextResponse.next();
    OLD_COOKIES.forEach(name => {
      if (request.cookies.has(name)) {
        response.cookies.delete(name);
      }
    });
    return response;
  }

  // Any other page — redirect unauthenticated users to /login and wipe old cookies
  if (!hasValidSession) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    OLD_COOKIES.forEach(name => {
      response.cookies.delete(name);
    });
    return response;
  }

  return NextResponse.next();
}

/**
 * Match all routes except API endpoints, Next.js internals, and static assets.
 */
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo-anteraja.png).*)'],
};
