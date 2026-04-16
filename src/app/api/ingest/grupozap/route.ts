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
    // Validate webhook secret
    const secret = process.env.GRUPOZAP_WEBHOOK_SECRET;
    if (secret) {
      const authHeader = request.headers.get('x-webhook-secret') || request.headers.get('authorization');
      if (authHeader !== secret && authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body: GrupoZapPayload = await request.json();

    // Validate required fields
    if (!body.lead?.name || !body.lead?.phone) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: lead.name, lead.phone' },
        { status: 400 }
      );
    }

    console.log(`\n🌐 Webhook Grupo OLX — ${body.source} — ${body.lead.name}`);

    const leadData: Omit<Lead, 'id' | 'criado_em'> = {
      nome: body.lead.name,
      telefone: normalizePhone(body.lead.phone),
      origem: 'webhook_grupozap' as LeadSource,
      portal_origem: portalLabel(body.source),
      moeda: 'BRL' as Moeda,
      finalidade: null,
      prazo: null,
      pagamento: null,
      descricao_interesse: body.lead.message || (body.listing?.title ? `Interesse em: ${body.listing.title}` : null),
      tipo_interesse: null,
      orcamento: null,
      area_interesse: null,
      quartos_interesse: null,
      vagas_interesse: null,
      bairros_interesse: body.listing?.address ? [body.listing.address] : null,
      corretor_id: null,
      status: 'novo',
    };

    if (mock.isMockMode()) {
      mock.seedTestData();
      const lead = mock.createLead(leadData);

      const { processLeadMockMode } = await import('@/lib/engine/processLeadMock');
      processLeadMockMode(lead).catch((err) => {
        console.error(`Erro ao processar lead webhook ${lead.nome}:`, err);
      });

      console.log(`✅ Lead criado via webhook: ${lead.nome} (${body.source})\n`);
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

    console.log(`✅ Lead webhook processado: ${lead.nome} (${body.source})\n`);
    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Erro interno ao processar webhook' },
      { status: 500 }
    );
  }
}
