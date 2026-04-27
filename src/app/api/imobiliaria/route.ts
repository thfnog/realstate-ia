import { NextResponse } from 'next/server';
import { getAuthFromCookies } from '@/lib/auth';
import * as mock from '@/lib/mockDb';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (mock.isMockMode()) {
    mock.seedTestData();
    const imob = mock.getImobiliariaById(session.imobiliaria_id) || mock.getImobiliariaById(mock.DEFAULT_IMOBILIARIA_ID);
    if (!imob) return NextResponse.json({ error: 'Tenant mock não encontrado' }, { status: 404 });
    return NextResponse.json(imob);
  }

  const { data, error } = await supabaseAdmin
    .from('imobiliarias')
    .select(`
      *,
      assinaturas (
        id,
        status,
        planos (
          id,
          nome,
          modulos
        )
      )
    `)
    .eq('id', session.imobiliaria_id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  // Map legacy plan names to module sets
  const subscription = Array.isArray(data.assinaturas) ? data.assinaturas[0] : data.assinaturas;
  let activeModules = subscription?.planos?.modulos;

  if (!activeModules) {
    if (data.plano === 'premium') activeModules = ['crm', 'dashboard', 'inventario', 'operacao', 'locacao', 'sistema'];
    else if (data.plano === 'pro') activeModules = ['crm', 'dashboard', 'inventario', 'operacao'];
    else activeModules = ['crm', 'dashboard', 'sistema'];
  }

  // Flatten plan data for easier frontend consumption
  const responseData = {
    ...data,
    active_plan: subscription?.planos?.nome || data.plano || 'Essencial',
    active_modules: activeModules
  };

  return NextResponse.json(responseData);
}

export async function PATCH(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await request.json();

    if (mock.isMockMode()) {
      const imob = mock.updateImobiliaria(session.imobiliaria_id, body);
      return NextResponse.json(imob);
    }

    const { data, error } = await supabaseAdmin
      .from('imobiliarias')
      .update(body)
      .eq('id', session.imobiliaria_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
