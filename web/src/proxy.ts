import { NextResponse, type NextRequest } from 'next/server';

// Next.js 16 renamed `middleware` -> `proxy` (nodejs runtime). This is a cheap
// early redirect for unauthenticated access; the authoritative checks (valid
// session, membership, role) live in the tenant layout and server actions.
const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token'];

export function proxy(request: NextRequest) {
  const authenticated = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!authenticated) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/r/:path*'],
};
