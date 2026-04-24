import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getLeadRepository } from '@/lib/repositories/factory';
import { waitUntil } from '@vercel/functions';
import { isMockMode } from '@/lib/mockDb';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imobiliaria_id = searchParams.get('imob_id');

    if (!imobiliaria_id) {
      console.error('[WEBHOOK ZAP] imob_id não fornecido na URL');
      return NextResponse.json({ error: 'imob_id is required' }, { status: 400 });
    }

    const body = await request.json();
    console.log('[WEBHOOK ZAP] Payload recebido:', JSON.stringify(body, null, 2));

    // Handle Canal Pro / Grupo ZAP structure
    // Note: Structure varies slightly between different lead portals.
    const leadData = body.lead || body;
    const name = leadData.name || leadData.nome || 'Lead Canal Pro';
    const email = leadData.email || '';
    const phone = leadData.phones?.[0] || leadData.phone || leadData.telefone || '';
    const message = leadData.message || leadData.mensagem || '';
    const listingId = leadData.listingId || leadData.listing_id || '';

    if (!phone) {
      console.warn('[WEBHOOK ZAP] Lead sem telefone ignorado');
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    const repository = getLeadRepository(supabaseAdmin);

    // Create the lead
    const lead = await repository.create({
      imobiliaria_id,
      nome: name,
      telefone: phone,
      origem: 'webhook_grupozap',
      portal_origem: body.origin || 'ZAP/VivaReal',
      descricao_interesse: message,
      // If we have listingId, we could potentially link to a property here
      // lead_id: ...
      status: 'novo',
    });

    // Trigger processing (auto-reply, assignment, etc.)
    if (isMockMode()) {
      const { processLeadMockMode } = await import('@/lib/engine/processLeadMock');
      processLeadMockMode(lead as any).catch(err => console.error('[WEBHOOK ZAP] Erro processamento mock:', err));
    } else {
      const { processLead } = await import('@/lib/engine/processLead');
      waitUntil(processLead(lead as any));
    }

    console.log(`[WEBHOOK ZAP] Lead processado com sucesso: ${lead.id}`);
    return NextResponse.json({ success: true, lead_id: lead.id });
  } catch (err: any) {
    console.error('[WEBHOOK ZAP] Erro crítico:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
