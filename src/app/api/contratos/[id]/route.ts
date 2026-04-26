import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getAuthFromCookies } from '@/lib/auth';
import { getContratoRepository } from '@/lib/repositories/factory';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repo = getContratoRepository(client);
    
    const data = await repo.findById(id);

    if (!data) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repo = getContratoRepository(client);

    const body = await req.json();
    const updated = await repo.update(id, body);

    // If status changed to 'ativo' and it's a 'venda', we trigger the commission/venda record
    if (body.status === 'ativo' && updated?.tipo === 'venda') {
      const { getVendaRepository } = require('@/lib/repositories/factory');
      const vendaRepo = getVendaRepository(client);
      
      await vendaRepo.create({
        imobiliaria_id: updated.imobiliaria_id,
        imovel_id: updated.imovel_id,
        corretor_id: updated.corretor_id,
        valor_venda: updated.valor_total,
        porcentagem_comissao: 5.0,
        data_venda: new Date().toISOString()
      });
      
      // Also update property status
      const { getImovelRepository } = require('@/lib/repositories/factory');
      const imovelRepo = getImovelRepository(client);
      if (updated.imovel_id) {
        await imovelRepo.update(updated.imovel_id, updated.imobiliaria_id, { status: 'vendido' });
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
