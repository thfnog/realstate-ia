import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const client = supabase;
    
    // 1. Create Proposal
    const { data: proposta, error } = await client
      .from('propostas_aluguel')
      .insert({
        imobiliaria_id: body.imobiliaria_id,
        imovel_id: body.imovel_id,
        inquilino_nome: body.inquilino_nome,
        inquilino_email: body.inquilino_email,
        inquilino_telefone: body.inquilino_telefone,
        valor_proposto: body.valor_proposto,
        garantia_pretendida: body.garantia_pretendida,
        data_pretendida_inicio: body.data_pretendida_inicio,
        observacoes: body.observacoes,
        status: 'pendente'
      })
      .select()
      .single();

    if (error) throw error;

    // 2. We could trigger a notification to the broker here

    return NextResponse.json(proposta);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
