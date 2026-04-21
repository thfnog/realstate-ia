import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { assignCorretor } from '@/lib/engine/assignCorretor';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Fetch Imobiliaria Basic Info (Public)
    const { data: imob, error: imobError } = await supabaseAdmin
      .from('imobiliarias')
      .select('id, config_pais, delay_auto_reply_sec')
      .eq('id', id)
      .single();

    if (imobError || !imob) {
      return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 });
    }

    // 2. Fetch On-Duty Broker (Public Business Data only)
    const broker = await assignCorretor(id);

    return NextResponse.json({
      config: imob,
      onDutyBroker: broker ? {
        nome: broker.nome,
        telefone: broker.telefone
      } : null
    });
  } catch (error: any) {
    console.error('Public Config API Error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
