import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthFromCookies } from '@/lib/auth';
import { isMockMode } from '@/lib/mockDb';

export async function GET() {
  try {
    const session = await getAuthFromCookies();
    if (!session || session.app_role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    if (isMockMode()) {
      const { getCorretores } = await import('@/lib/mockDb');
      // In mock, we don't have a specific user list for imob, we simulate
      const corretores = getCorretores(session.imobiliaria_id);
      const mockUsers = corretores.map(c => ({
        id: `user-${c.id}`,
        email: c.email || 'sem@email.com',
        role: 'corretor',
        corretor_id: c.id,
        nome: c.nome,
        ativo: true,
        criado_em: c.criado_em,
      }));
      return NextResponse.json(mockUsers);
    }

    // REAL MODE: Fetch from public.usuarios with Corretores join
    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .select('*, corretores(nome)')
      .eq('imobiliaria_id', session.imobiliaria_id)
      .order('criado_em', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[USERS GET] Erro:', err);
    return NextResponse.json({ error: 'Erro ao carregar usuários' }, { status: 500 });
  }
}
