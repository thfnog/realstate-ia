import { NextResponse } from 'next/server';
import { getAuthFromCookies } from '@/lib/auth';

export async function GET() {
  const session = await getAuthFromCookies();
  
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  return NextResponse.json(session);
}
