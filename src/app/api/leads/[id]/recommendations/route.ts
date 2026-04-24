import { NextResponse } from 'next/server';
import { recommendImoveis } from '@/lib/engine/recommendImoveis';
import { recommendImovelsMock } from '@/lib/engine/recommendImovelsMock';
import { isMockMode } from '@/lib/mockDb';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Fetch Lead
    let lead;
    if (isMockMode()) {
       const mock = require('@/lib/mockDb');
       lead = mock.getLeads().find((l: any) => l.id === id);
    } else {
       const { data, error } = await supabaseAdmin.from('leads').select('*').eq('id', id).single();
       if (error) return NextResponse.json({ error: error.message }, { status: 404 });
       lead = data;
    }

    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

    // 2. Run Engine
    const recommended = isMockMode() 
      ? recommendImovelsMock(lead) 
      : await recommendImoveis(lead);

    return NextResponse.json(recommended);
  } catch (err) {
    console.error('Matching API Error:', err);
    return NextResponse.json({ error: 'Erro ao gerar recomendações' }, { status: 500 });
  }
}
