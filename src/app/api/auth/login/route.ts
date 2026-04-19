import { NextResponse } from 'next/server';
import { signIn } from '@/lib/auth';
import * as mock from '@/lib/mockDb';

export async function POST(request: Request) {
  try {
    if (mock.isMockMode()) {
       mock.seedTestData();
    }
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const token = await signIn(email, password);

    if (!token) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });

    // Set HTTP-only cookie with the token
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
