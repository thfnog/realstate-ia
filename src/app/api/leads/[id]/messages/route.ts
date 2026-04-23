import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (mock.isMockMode()) {
      return NextResponse.json([]); // Mock doesn't have history yet
    }

    const { data, error } = await supabaseAdmin
      .from('mensagens_historico')
      .select('*')
      .eq('lead_id', id)
      .order('criado_em', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('❌ Erro ao buscar histórico de mensagens:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
