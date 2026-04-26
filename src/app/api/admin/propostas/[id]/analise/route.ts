import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthFromCookies } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    
    const { data, error } = await supabase
      .from('propostas_aluguel')
      .update({
        analise_credito_check_serasa: body.analise_credito_check_serasa,
        analise_credito_check_renda: body.analise_credito_check_renda,
        analise_credito_check_antecedentes: body.analise_credito_check_antecedentes,
        analise_credito_parecer: body.analise_credito_parecer,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', id)
      .eq('imobiliaria_id', session.imobiliaria_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
