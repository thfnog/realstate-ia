import { NextResponse } from 'next/server';
import { getAuthFromCookies } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const session = await getAuthFromCookies();
  if (!session || session.app_role !== 'master' && session.email !== 'admin@imobia.com') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  // Fetch imobiliarias with their active subscription and plan details
  const { data, error } = await supabaseAdmin
    .from('imobiliarias')
    .select(`
      *,
      assinaturas (
        id,
        status,
        periodo_inicio,
        periodo_fim,
        planos (
          id,
          nome,
          preco_mensal
        )
      )
    `)
    .order('criado_em', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const session = await getAuthFromCookies();
  if (!session || session.app_role !== 'master' && session.email !== 'admin@imobia.com') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { id, ...updates } = await req.json();
  const { data, error } = await supabaseAdmin
    .from('imobiliarias')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
