import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// These routes don't require authentication
const publicRoutes = [
  '/login',
  '/registro',
  '/api/auth/login',
  '/api/auth/register',
  '/api/ingest',
  '/api/webhooks',
  '/api/public',
  '/api/cron', // Cron routes have their own internal validation
  '/_next',
  '/favicon.ico',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's a public route
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get token from cookies
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    console.log('Middleware: No token found for', pathname);
    /* 
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
    */
    return NextResponse.next();
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.SUPABASE_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-dev-secret-only-for-local-mock'
    );
    
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware Auth Error for', pathname, ':', error);
    /*
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
    */
    return NextResponse.next();
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/public (public APIs)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/public|_next/static|_next/image|favicon.ico).*)',
  ],
};
