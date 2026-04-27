import { NextResponse } from 'next/server';
import { getAuthFromCookies } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const session = await getAuthFromCookies();
  if (!session || session.app_role !== 'admin' && session.app_role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // 1. Fetch imobiliaria info (billing card)
  const { data: imob } = await supabaseAdmin
    .from('imobiliarias')
    .select('cartao_final, cartao_bandeira, nome')
    .eq('id', session.imobiliaria_id)
    .single();

  // 2. Fetch subscription
  const { data: assinatura } = await supabaseAdmin
    .from('assinaturas')
    .select('*, planos(*)')
    .eq('tenant_id', session.imobiliaria_id)
    .maybeSingle();

  // 3. Fetch invoices
  const { data: faturas } = await supabaseAdmin
    .from('faturas')
    .select('*')
    .eq('tenant_id', session.imobiliaria_id)
    .order('created_at', { ascending: false });

  // 4. Count users
  const { count: userCount } = await supabaseAdmin
    .from('usuarios')
    .select('*', { count: 'exact', head: true })
    .eq('imobiliaria_id', session.imobiliaria_id);

  return NextResponse.json({
    imobiliaria: imob,
    assinatura,
    faturas: faturas || [],
    userCount: userCount || 0
  });
}

export async function POST(request: Request) {
  const session = await getAuthFromCookies();
  if (!session || session.app_role !== 'admin' && session.app_role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { action, ...data } = await request.json();

  if (action === 'update_card') {
    const { cartao_final, cartao_bandeira } = data;
    const { error } = await supabaseAdmin
      .from('imobiliarias')
      .update({ cartao_final, cartao_bandeira })
      .eq('id', session.imobiliaria_id);
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'change_plan') {
    const { plano_id } = data;
    
    // Check if subscription exists
    const { data: existing } = await supabaseAdmin
      .from('assinaturas')
      .select('id')
      .eq('tenant_id', session.imobiliaria_id)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from('assinaturas')
        .update({ plano_id, updated_at: new Date().toISOString() })
        .eq('tenant_id', session.imobiliaria_id);
    } else {
      await supabaseAdmin
        .from('assinaturas')
        .insert({
          tenant_id: session.imobiliaria_id,
          plano_id,
          status: 'ativo'
        });
    }

    // Update imobiliaria active modules based on plan
    const { data: plano } = await supabaseAdmin
      .from('planos')
      .select('modulos')
      .eq('id', plano_id)
      .single();

    if (plano) {
       await supabaseAdmin
         .from('imobiliarias')
         .update({ active_modules: plano.modulos })
         .eq('id', session.imobiliaria_id);
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}
