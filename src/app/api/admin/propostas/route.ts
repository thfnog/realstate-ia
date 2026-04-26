import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthFromCookies } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { data, error } = await supabase
      .from('propostas_aluguel')
      .select('*, imovel:imoveis(*), documentos:propostas_documentos(*)')
      .eq('imobiliaria_id', session.imobiliaria_id)
      .order('criado_em', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
