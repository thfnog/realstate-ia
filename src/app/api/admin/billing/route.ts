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
    
    // 1. Get new plan details
    const { data: newPlano } = await supabaseAdmin
      .from('planos')
      .select('id, limite_usuarios, modulos, nome')
      .eq('id', plano_id)
      .single();

    if (!newPlano) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

    // 2. Count current users
    const { count: userCount } = await supabaseAdmin
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('imobiliaria_id', session.imobiliaria_id);

    // 3. Validate limit (Downgrade Guard)
    if (userCount && userCount > newPlano.limite_usuarios) {
      return NextResponse.json({ 
        error: `Não é possível migrar para o plano ${newPlano.nome}. Sua imobiliária possui ${userCount} usuários ativos, mas este plano permite apenas ${newPlano.limite_usuarios}. Inative ou remova alguns usuários na tela de Gestão de Usuários antes de prosseguir.` 
      }, { status: 400 });
    }

    // 4. Update or Create subscription
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

    // 5. Update imobiliaria active modules
    await supabaseAdmin
      .from('imobiliarias')
      .update({ active_modules: newPlano.modulos })
      .eq('id', session.imobiliaria_id);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}
