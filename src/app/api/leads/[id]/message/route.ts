import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import * as mock from '@/lib/mockDb';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { message } = await request.json();
    let lead;

    // 1. Get lead phone
    if (mock.isMockMode()) {
      lead = mock.getLeads().find(l => l.id === id);
    } else {
      const { data } = await supabaseAdmin
        .from('leads')
        .select('telefone')
        .eq('id', id)
        .single();
      lead = data;
    }

    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

    // 2. Send WhatsApp
    await sendWhatsAppMessage(lead.telefone, message);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Erro ao enviar mensagem manual:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
