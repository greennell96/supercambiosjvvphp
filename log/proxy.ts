/**
 * Route protection.
 *
 * In Next.js 16 the file that used to be `middleware.ts` is called `proxy.ts`
 * and exports a function named `proxy`. Same job: it runs before every matched
 * request. Anything without a valid session cookie is bounced to /login.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE, getSessionSecret, isValidSessionToken } from './lib/session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The login page itself must stay reachable.
  if (pathname === '/login') return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await isValidSessionToken(token, getSessionSecret())) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything except Next's own asset routes and the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
