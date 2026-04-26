import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mes = searchParams.get('mes');
    const ano = searchParams.get('ano');

    if (!mes || !ano) {
      return NextResponse.json({ error: 'Mês e ano são obrigatórios' }, { status: 400 });
    }

    // Busca cobranças do período (data_vencimento dentro do mês/ano)
    const startDate = `${ano}-${mes}-01`;
    const endDate = new Date(parseInt(ano), parseInt(mes), 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('contratos_pagamentos')
      .select(`
        *,
        contrato:contratos (
          id,
          imovel:imoveis (referencia, titulo),
          lead:leads (nome),
          valor_total,
          taxa_administracao_porcentagem,
          proprietario_nome
        )
      `)
      .gte('data_vencimento', startDate)
      .lte('data_vencimento', endDate)
      .order('data_vencimento', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
