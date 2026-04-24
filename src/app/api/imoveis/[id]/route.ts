import { NextResponse } from 'next/server';
import { getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getImovelRepository } from '@/lib/repositories/factory';
import { getAuthFromCookies } from '@/lib/auth';

// GET: Fetch a single property
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getImovelRepository(client);

    const imovel = await repository.findById(id, session.imobiliaria_id);
    if (!imovel) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    return NextResponse.json(imovel);
  } catch (err) {
    console.error('SERVER ERROR GET IMOVEL:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT: Update a property
export async function PUT(
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
    const repository = getImovelRepository(client);

    // Filter fields to avoid accidental overwrites of sensitive system fields if any
    const imovelData = { ...body };
    delete imovelData.id;
    delete imovelData.criado_em;
    delete imovelData.imobiliaria_id;

    const updated = await repository.update(id, session.imobiliaria_id, imovelData);
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('API PUT Error:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

// DELETE: Delete a property
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getImovelRepository(client);

    await repository.delete(id, session.imobiliaria_id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('SERVER ERROR DELETE IMOVEL:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
