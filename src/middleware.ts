import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  console.log("------------------------")

  if (pathname === '/') {
    // Build the full redirect URL
    const redirectUrl = `${origin}/s3-browser-login`;
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/',
};
