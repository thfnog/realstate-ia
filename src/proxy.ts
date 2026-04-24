import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

// Routes that don't require authentication
const publicRoutes = [
  '/login',
  '/registro',
  '/auth/confirm',
  '/api/auth',
  '/api/public',
  '/api/ingest',
  '/api/webhooks',
  '/api/cron',
  '/_next',
  '/favicon.ico',
  '/formulario'
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip for public routes and root
  if (pathname === '/' || publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 2. Check for auth-token cookie
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // 3. Verify token
  const payload = await verifyToken(token);

  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  // 4. Role-based protection
  if (payload.app_role === 'corretor') {
    const adminOnlyRoutes = [
      '/admin/config',
      '/admin/carteira',
      '/admin/webhook-logs',
      '/admin/usuarios'
    ];
    
    if (adminOnlyRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

// Matching Paths
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
