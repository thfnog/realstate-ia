import { NextResponse } from 'next/server';
import { getUserSupabaseClient } from '@/lib/supabase';
import { getEventoRepository } from '@/lib/repositories/factory';
import { getAuthFromCookies } from '@/lib/auth';
import { cookies } from 'next/headers';
import type { Evento } from '@/lib/database.types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getEventoRepository(client);

    const evento = await repository.findById(id, session.imobiliaria_id);

    if (!evento) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    return NextResponse.json(evento);
  } catch (err: any) {
    console.error('[API Evento GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getEventoRepository(client);

    const updated = await repository.update(id, session.imobiliaria_id, body);

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('[API Evento PATCH Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getEventoRepository(client);

    await repository.delete(id, session.imobiliaria_id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API Evento DELETE Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
