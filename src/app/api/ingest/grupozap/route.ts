/**
 * POST /api/ingest/grupozap — Webhook endpoint for Grupo OLX (Brasil)
 *
 * Receives lead webhooks from ZAP Imóveis, OLX, and VivaReal.
 * Validates the webhook secret, normalizes the payload, and triggers
 * the processing pipeline.
 *
 * Expected payload (Grupo OLX / Canal Pro format):
 * {
 *   lead: { name, email, phone, message? },
 *   listing: { id, title, address? },
 *   source: 'ZAP' | 'VivaReal' | 'OLX'
 * }
 */

import { NextResponse } from 'next/server';
import * as mock from '@/lib/mockDb';
import type { Lead, LeadSource, Moeda } from '@/lib/database.types';

interface GrupoZapPayload {
  lead: {
    name: string;
    email?: string;
    phone: string;
    message?: string;
  };
  listing: {
    id: string;
    title?: string;
    address?: string;
  };
  source: 'ZAP' | 'VivaReal' | 'OLX';
}

function normalizePhone(phone: string): string {
  // Remove non-digits, ensure Brazilian format
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function portalLabel(source: string): string {
  const map: Record<string, string> = {
    ZAP: 'ZAP Imóveis',
    VivaReal: 'VivaReal',
    OLX: 'OLX',
  };
  return map[source] || source;
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imobId = searchParams.get('imob_id');

    if (!imobId) {
      return NextResponse.json({ error: 'Faltando imob_id na URL do webhook' }, { status: 400 });
    }

    // Validate webhook secret
    const secret = process.env.GRUPOZAP_WEBHOOK_SECRET;
    if (secret) {
      const authHeader = request.headers.get('x-webhook-secret') || request.headers.get('authorization');
      if (authHeader !== secret && authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();

    // Standardize fields from Canal Pro / Grupo OLX unified payload
    // Note: They sometimes wrap fields in 'lead' or 'contact' or send them flat.
    const name = body.name || body.lead?.name || body.contact?.name;
    const phone = body.phone || body.lead?.phone || body.contact?.phone;
    const email = body.email || body.lead?.email || body.contact?.email;
    const ddd = body.ddd || body.lead?.ddd || '';
    const message = body.message || body.lead?.message || body.contact?.message;
    const listingId = body.clientListingId || body.originListingId || body.listing?.id;
    const source = body.leadOrigin || body.source || 'ZAP';
    const type = body.extraData?.leadType || 'CONTACT_FORM';
    const finalidade = body.transactionType === 'RENT' ? 'alugar' : 'comprar';

    // Validate required fields
    if (!name || (!phone && !email)) {
      return NextResponse.json(
        { error: 'Dados insuficientes (nome e contato necessários)' },
        { status: 400 }
      );
    }

    const fullPhone = ddd ? `${ddd}${phone}` : phone;

    console.log(`\n🌐 Webhook Grupo OLX — ${source} — ${name}`);

    const leadData: Omit<Lead, 'id' | 'criado_em'> = {
      imobiliaria_id: imobId,
      nome: name,
      telefone: normalizePhone(fullPhone),
      origem: 'webhook_grupozap' as LeadSource,
      portal_origem: source,
      moeda: 'BRL' as Moeda,
      finalidade: finalidade as any,
      prazo: null,
      pagamento: null,
      descricao_interesse: message || (listingId ? `Referência Imóvel: ${listingId} (${type})` : null),
      tipo_interesse: null,
      orcamento: null,
      area_interesse: null,
      quartos_interesse: null,
      vagas_interesse: null,
      bairros_interesse: null,
      corretor_id: null,
      status: 'novo',
    };

    if (mock.isMockMode()) {
      mock.seedTestData();
      // Ensure imob exists in mock
      const imob = mock.getImobiliariaById(imobId);
      if (!imob) {
        return NextResponse.json({ error: 'Imobiliária não encontrada no Mock' }, { status: 404 });
      }

      const lead = mock.createLead(leadData);

      const { processLeadMockMode } = await import('@/lib/engine/processLeadMock');
      processLeadMockMode(lead).catch((err) => {
        console.error(`Erro ao processar lead webhook ${lead.nome}:`, err);
      });

      console.log(`✅ Lead criado via webhook (MOCK): ${lead.nome} (${source})\n`);
      return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
    }

    // Production: insert into Supabase
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir lead webhook:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { processLead } = await import('@/lib/engine/processLead');
    processLead(lead as Lead).catch((err) => {
      console.error(`Erro ao processar lead webhook ${lead.nome}:`, err);
    });

    console.log(`✅ Lead webhook processado: ${lead.nome} (${source})\n`);
    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
  } catch (err) {
    console.error('Erro grave no webhook:', err);
    return NextResponse.json(
      { error: 'Erro interno ao processar webhook' },
      { status: 500 }
    );
  }
}
