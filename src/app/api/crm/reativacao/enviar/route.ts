import { NextResponse } from 'next/server';
import { getAuthFromCookies } from '@/lib/auth';
import { sendReactivationMessage } from '@/lib/engine/leadReactivationEngine';
import { supabaseAdmin } from '@/lib/supabase';
import { isMockMode } from '@/lib/mockDb';
import * as mockDb from '@/lib/mockDb';
import type { CountryCode } from '@/lib/countryConfig';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { lead_ids, lead_id, mensagem, custom_messages } = body;

    const targetLeadIds: string[] = Array.isArray(lead_ids) 
      ? lead_ids 
      : (lead_id ? [lead_id] : []);

    if (targetLeadIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum lead_id fornecido' }, { status: 400 });
    }

    let config_pais: CountryCode = 'BR';
    if (isMockMode()) {
      const imob = mockDb.getImobiliariaById(session.imobiliaria_id);
      config_pais = (imob?.config_pais as CountryCode) || 'BR';
    } else {
      const { data: imobData } = await supabaseAdmin
        .from('imobiliarias')
        .select('config_pais')
        .eq('id', session.imobiliaria_id)
        .single();
      if (imobData) config_pais = (imobData.config_pais as CountryCode) || 'BR';
    }

    const results: Array<{ lead_id: string; success: boolean; error?: string }> = [];

    for (const id of targetLeadIds) {
      const msgToSend = custom_messages?.[id] || mensagem;
      if (!msgToSend) {
        results.push({ lead_id: id, success: false, error: 'Mensagem vazia para este lead' });
        continue;
      }

      const res = await sendReactivationMessage({
        lead_id: id,
        mensagem: msgToSend,
        imobiliaria_id: session.imobiliaria_id,
        corretor_id: session.app_role === 'corretor' ? session.corretor_id : undefined,
        config_pais
      });

      results.push({
        lead_id: id,
        success: res.success,
        error: res.error
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      sent_count: successCount,
      failed_count: failedCount,
      results
    });

  } catch (err: any) {
    console.error('[API CRM Reativação Enviar Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
