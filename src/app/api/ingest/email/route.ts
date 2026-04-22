/**
 * POST /api/ingest/email — Trigger email ingestion (Portugal / eGO)
 *
 * Called manually or via cron. Reads unread emails, parses leads, and
 * triggers the processing pipeline for each one.
 *
 * Query params:
 *   ?test=true — run in mock/test mode
 *   ?imob_id=ID — specific tenant
 */

import { NextResponse } from 'next/server';
import { parseIncomingEmails, emailLeadToCreateData } from '@/lib/ingest/emailParser';
import { parseEmailBody } from '@/lib/ingest/email/parser';
import * as mock from '@/lib/mockDb';
import type { Lead } from '@/lib/database.types';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isTest = searchParams.get('test') === 'true';
    const imobId = searchParams.get('imob_id');

    // In PT, we expect imob_id if it's a specific tenant trigger
    const activeImobId = imobId || (mock.isMockMode() ? mock.DEFAULT_IMOBILIARIA_ID : null);

    if (!activeImobId) {
      return NextResponse.json({ error: 'Faltando imob_id na URL' }, { status: 400 });
    }

    // Attempt to read body for direct parsing test
    let rawEmailBody = '';
    try {
      const cloned = request.clone();
      const json = await cloned.json();
      rawEmailBody = json.body || '';
    } catch {
      // No JSON body
    }

    console.log(`\n📧 Ingest Email — ${isTest ? 'TESTE' : 'PRODUÇÃO'} — Tenant: ${activeImobId}`);

    let leadsToProcess: any[] = [];
    const errors: string[] = [];

    if (rawEmailBody) {
      // Manual/Test direct parse
      console.log('  → Parsing direto do corpo enviado...');
      const parsed = parseEmailBody(rawEmailBody);
      leadsToProcess.push(parsed);
    } else {
      // Standard IMAP fetch (currently mocked)
      const result = await parseIncomingEmails({ test: isTest });
      leadsToProcess = result.leads.map(l => emailLeadToCreateData(l, activeImobId!));
      errors.push(...result.errors);
    }

    if (leadsToProcess.length === 0 && errors.length > 0) {
      return NextResponse.json({ error: 'Nenhum lead encontrado', details: errors }, { status: 500 });
    }

    const processed: string[] = [];

    for (const data of leadsToProcess) {
      try {
        const leadData: Omit<Lead, 'id' | 'criado_em'> = {
          ...data,
          imobiliaria_id: activeImobId,
          status: 'novo',
          origem: 'email_ego',
          moeda: 'EUR',
          finalidade: data.finalidade || 'comprar',
        } as any;

        if (mock.isMockMode()) {
          mock.seedTestData();
          const lead = mock.createLead(leadData);
          
          const { processLeadMockMode } = await import('@/lib/engine/processLeadMock');
          processLeadMockMode(lead).catch((err) => {
            console.error(`Erro ao processar lead ${lead.nome}:`, err);
          });

          processed.push(`${lead.nome} (${lead.portal_origem || 'Portal'})`);
        } else {
          // Production: insert into Supabase
          const { supabaseAdmin } = await import('@/lib/supabase');

          // De-duplication check
          const { data: existing } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('imobiliaria_id', activeImobId)
            .eq('telefone', leadData.telefone)
            .maybeSingle();

          if (existing && !['vendido', 'descartado', 'finalizado'].includes(existing.status)) {
            console.log(`♻️ Ingest E-mail: Lead duplicado detectado (${leadData.telefone}). Atualizando lead ${existing.id}.`);
            
            const { data: updated } = await supabaseAdmin
              .from('leads')
              .update({
                descricao_interesse: `${existing.descricao_interesse || ''}\n--- Novo Interesse E-mail ---\n${leadData.descricao_interesse || ''}`,
                finalidade: leadData.finalidade || existing.finalidade,
              })
              .eq('id', existing.id)
              .select()
              .single();

            // Add timeline event
            await supabaseAdmin.from('eventos').insert({
              imobiliaria_id: activeImobId,
              lead_id: existing.id,
              tipo: 'outro',
              titulo: `📧 Novo interesse via E-mail`,
              descricao: `O lead demonstrou interesse em um imóvel via notificação de e-mail do portal.`,
              data_hora: new Date().toISOString(),
              status: 'realizado'
            });

            processed.push(`${existing.nome} (Atualizado)`);
            continue;
          }

          const { data: lead, error } = await supabaseAdmin
            .from('leads')
            .insert(leadData)
            .select()
            .single();

          if (error) {
            errors.push(`Erro ao inserir ${data.nome}: ${error.message}`);
            continue;
          }

          const { processLead } = await import('@/lib/engine/processLead');
          processLead(lead as Lead).catch((err) => {
            console.error(`Erro ao processar lead ${lead.nome}:`, err);
          });

          processed.push(`${lead.nome} (${lead.portal_origem || 'Portal'})`);
        }
      } catch (err) {
        errors.push(`Erro com ${data.nome || 'lead'}: ${String(err)}`);
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: processed.length,
      leads: processed,
      errors: errors.filter(e => !e.includes('not yet implemented')),
    });
  } catch (err) {
    console.error('Erro na ingestão de e-mail:', err);
    return NextResponse.json({ error: 'Erro interno ao processar e-mails' }, { status: 500 });
  }
}
