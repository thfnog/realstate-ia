import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getLeadRepository } from '@/lib/repositories/factory';
import { getAuthFromCookies } from '@/lib/auth';

// GET: List all clients (non-discarded leads)
export async function GET(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined; // Se não passar, filtramos no frontend ou trazemos todos
    const corretor_id = searchParams.get('corretor_id') || (session.app_role === 'corretor' ? (session.corretor_id || undefined) : undefined);
    const classificacao = searchParams.get('classificacao') || undefined;
    const origem = searchParams.get('origem') || undefined;
    const grupo_jid = searchParams.get('grupo_jid') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const isAdmin = session.app_role === 'admin' || session.app_role === 'master';
    const client = isAdmin ? supabaseAdmin : getUserSupabaseClient(token);
    const repository = getLeadRepository(client);

    // Buscamos todos os leads usando o repositório de leads
    const { data, count } = await repository.findAll({
      imobiliaria_id: session.imobiliaria_id,
      status: status || undefined,
      corretor_id,
      search,
      origem,
      page,
      limit
    });

    // Filtramos localmente se precisarmos de classificação, grupo ou apenas leads não descartados (se não houver filtro de status explícito)
    let filteredData = data;
    
    if (classificacao) {
      filteredData = filteredData.filter(l => (l as any).classificacao === classificacao);
    }
    
    if (grupo_jid) {
      filteredData = filteredData.filter(l => (l as any).grupo_jid === grupo_jid);
    }

    // Se o filtro de status não foi provido, nós podemos opcionalmente excluir leads descartados e finalizados para focar no pipeline ativo
    if (!status) {
      filteredData = filteredData.filter(l => l.status !== 'descartado');
    }

    return NextResponse.json({
      data: filteredData,
      count: filteredData.length === data.length ? count : filteredData.length,
      page,
      limit
    });
  } catch (err: any) {
    console.error('Error GET /api/clientes:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
