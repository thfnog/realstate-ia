import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthFromCookies } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    // 1. Get the proposal
    const { data: proposta, error: pError } = await supabase
      .from('propostas_aluguel')
      .select('*')
      .eq('id', id)
      .eq('imobiliaria_id', session.imobiliaria_id)
      .single();

    if (pError || !proposta) throw new Error('Proposta não encontrada');
    if (proposta.status !== 'aprovada') throw new Error('Apenas propostas aprovadas podem ser convertidas');

    // 2. Create the contract
    const { data: contrato, error: cError } = await supabase
      .from('contratos')
      .insert({
        imobiliaria_id: session.imobiliaria_id,
        imovel_id: proposta.imovel_id,
        lead_id: null, // Ideally we would link to the lead if exists
        tipo: 'aluguel',
        valor_total: proposta.valor_proposto,
        data_inicio: proposta.data_pretendida_inicio || new Date().toISOString(),
        status: 'rascunho',
        taxa_administracao_porcentagem: 10,
        garantia_tipo: proposta.garantia_pretendida,
        // Fill owner details if needed
      })
      .select()
      .single();

    if (cError) throw cError;

    // 3. Update proposal status
    await supabase.from('propostas_aluguel').update({ status: 'finalizada' }).eq('id', id);

    return NextResponse.json(contrato);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
