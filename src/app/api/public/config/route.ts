import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { assignCorretor } from '@/lib/engine/assignCorretor';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imobId = searchParams.get('imob_id');
    const imovelId = searchParams.get('imovel_id');

    let targetImobId = imobId;

    // 1. If imovelId is provided, find the imobiliaria_id
    if (!targetImobId && imovelId) {
      const { data: imovel } = await supabaseAdmin
        .from('imoveis')
        .select('imobiliaria_id')
        .eq('id', imovelId)
        .single();
      if (imovel) targetImobId = imovel.imobiliaria_id;
    }

    // 2. Fetch Config & Broker
    if (targetImobId) {
      const { data: imob } = await supabaseAdmin
        .from('imobiliarias')
        .select('id, config_pais, delay_auto_reply_sec')
        .eq('id', targetImobId)
        .single();

      if (imob) {
        const broker = await assignCorretor(targetImobId);
        return NextResponse.json({
          config: imob,
          onDutyBroker: broker ? { nome: broker.nome, telefone: broker.telefone } : null,
          method: 'agency-context'
        });
      }
    }

    // 3. FALLBACK: Geolocation discovery (for generic accesses)
    const headerList = await headers();
    const countryHeader = headerList.get('x-vercel-ip-country') || 'PT';
    
    // We only support BR and PT explicitly for now
    const detectedCountry = countryHeader === 'BR' ? 'BR' : 'PT';

    return NextResponse.json({
      config: {
        config_pais: detectedCountry,
        delay_auto_reply_sec: 20
      },
      onDutyBroker: null,
      method: 'geolocation'
    });

  } catch (error: any) {
    console.error('Public Config Generic API Error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
