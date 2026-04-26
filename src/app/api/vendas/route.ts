import { NextResponse } from 'next/server';
import { getUserSupabaseClient } from '@/lib/supabase';
import { getVendaRepository, getImovelRepository } from '@/lib/repositories/factory';
import { getAuthFromCookies } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { imovel_id, valor_venda, porcentagem_comissao, data_venda } = body;

    if (!imovel_id || !valor_venda || !porcentagem_comissao) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    
    const vendaRepo = getVendaRepository(client);
    const imovelRepo = getImovelRepository(client);

    // 1. Get Property to ensure ownership and get corretor_id if not provided
    const imovel = await imovelRepo.findById(imovel_id, session.imobiliaria_id);
    if (!imovel) return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });

    // 2. Create Venda record
    const valor_comissao = (valor_venda * porcentagem_comissao) / 100;
    const venda = await vendaRepo.create({
      imobiliaria_id: session.imobiliaria_id,
      imovel_id,
      corretor_id: imovel.corretor_id,
      valor_venda,
      porcentagem_comissao,
      valor_comissao,
      data_venda: data_venda || new Date().toISOString()
    });

    // 3. Update Property status to 'vendido'
    await imovelRepo.update(imovel_id, session.imobiliaria_id, { status: 'vendido' });

    return NextResponse.json(venda);
  } catch (err: any) {
    console.error('[API VENDAS ERROR]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const corretor_id = searchParams.get('corretor_id') || undefined;
    const start_date = searchParams.get('start_date') || undefined;
    const end_date = searchParams.get('end_date') || undefined;

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    
    const vendaRepo = getVendaRepository(client);
    
    // Non-admins can only see their own sales
    let targetCorretorId = corretor_id;
    if (session.app_role === 'corretor' && session.corretor_id) {
      targetCorretorId = session.corretor_id;
    }

    const vendas = await vendaRepo.findAll({
      imobiliaria_id: session.imobiliaria_id,
      corretor_id: targetCorretorId,
      start_date,
      end_date
    });

    return NextResponse.json(vendas);
  } catch (err: any) {
    console.error('[API VENDAS GET ERROR]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
