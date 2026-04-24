import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip middleware for static assets, public APIs, and auth pages
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/registro') ||
    pathname.startsWith('/auth/confirm') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/public') ||
    pathname === '/' ||
    pathname === '/formulario'
  ) {
    return NextResponse.next();
  }

  // 2. Check for auth-token cookie
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Redirect to login if trying to access protected routes
    if (pathname.startsWith('/admin')) {
      const url = new URL('/login', request.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 3. Verify token
  const payload = await verifyToken(token);

  if (!payload) {
    // Invalid token, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  // 4. Role-based protection
  // Brokers cannot access Admin-only pages
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

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
