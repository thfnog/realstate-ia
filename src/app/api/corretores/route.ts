import { NextResponse } from 'next/server';
import { getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getCorretorRepository } from '@/lib/repositories/factory';
import { getAuthFromCookies } from '@/lib/auth';

// GET: List all brokers
export async function GET() {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value || '';
  const client = getUserSupabaseClient(token);
  const repository = getCorretorRepository(client);

  const data = await repository.findAll(session.imobiliaria_id);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  
  try {
    const body = await request.json();

    if (!body.nome || !body.telefone) {
      return NextResponse.json(
        { error: 'Nome e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getCorretorRepository(client);

    const corretor = await repository.create({
      imobiliaria_id: session.imobiliaria_id,
      nome: body.nome,
      telefone: body.telefone,
      email: body.email || null,
      ativo: body.ativo ?? true,
    });

    return NextResponse.json(corretor, { status: 201 });
  } catch (err: any) {
    console.error('SERVER ERROR POST CORRETOR:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
