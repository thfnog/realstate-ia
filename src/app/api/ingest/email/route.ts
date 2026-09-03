/**
 * POST /api/ingest/email — Trigger email ingestion (Brasil e Portugal)
 *
 * Suporta portais brasileiros (Imovelweb, Chaves na Mão, Loft, Casa Mineira, QuintoAndar, OLX)
 * e portugueses (Idealista, Imovirtual, Casa SAPO, eGO).
 *
 * Query params / JSON payload:
 *   ?test=true — run in mock/test mode
 *   ?imob_id=ID — specific tenant
 * Body JSON:
 *   { body: string, subject?: string, from?: string, imobiliaria_id?: string }
 */

import { NextResponse } from 'next/server';
import { parseIncomingEmails, emailLeadToCreateData } from '@/lib/ingest/emailParser';
import { parseEmailBody as parsePTEmailBody, detectPortal as detectPTPortal } from '@/lib/ingest/email/parser';
import { parsePortalEmail, detectBRPortal, portalLeadToLeadData } from '@/lib/engine/portalEmailParser';
import * as mock from '@/lib/mockDb';
import type { Lead } from '@/lib/database.types';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isTest = searchParams.get('test') === 'true';
    const queryImobId = searchParams.get('imob_id');

    // Attempt to read body for direct parsing
    let rawEmailBody = '';
    let emailSubject = '';
    let emailFrom = '';
    let bodyImobId = '';

    try {
      const cloned = request.clone();
      const json = await cloned.json();
      rawEmailBody = json.body || json.text || json.html || '';
      emailSubject = json.subject || '';
      emailFrom = json.from || '';
      bodyImobId = json.imobiliaria_id || json.imob_id || '';
    } catch {
      // No JSON body
    }

    const activeImobId = queryImobId || bodyImobId || (mock.isMockMode() ? mock.DEFAULT_IMOBILIARIA_ID : null);

    if (!activeImobId) {
      return NextResponse.json({ error: 'Faltando imob_id na requisição' }, { status: 400 });
    }

    // Determine country config if possible
    let configPais: 'BR' | 'PT' = 'BR';
    if (!mock.isMockMode()) {
      try {
        const { supabaseAdmin } = await import('@/lib/supabase');
        const { data: imob } = await supabaseAdmin
          .from('imobiliarias')
          .select('config_pais')
          .eq('id', activeImobId)
          .maybeSingle();
        if (imob?.config_pais) configPais = imob.config_pais as 'BR' | 'PT';
      } catch (e) {
        console.warn('Não foi possível carregar config_pais da imobiliária:', e);
      }
    }

    console.log(`\n📧 Ingest Email — ${isTest ? 'TESTE' : 'PRODUÇÃO'} — Tenant: ${activeImobId} (${configPais})`);

    let leadsToProcess: any[] = [];
    const errors: string[] = [];

    if (rawEmailBody) {
      console.log('  → Parsing direto do e-mail recebido...');
      const brPortal = detectBRPortal(rawEmailBody, emailSubject, emailFrom);
      const ptPortal = detectPTPortal(rawEmailBody);

      if (brPortal !== 'generico_br' || configPais === 'BR') {
        // Portal Brasileiro
        const parsedBR = parsePortalEmail(rawEmailBody, emailSubject, emailFrom);
        const leadData = portalLeadToLeadData(parsedBR, activeImobId);
        leadsToProcess.push(leadData);
      } else if (ptPortal !== 'desconhecido' || configPais === 'PT') {
        // Portal Portugal
        const parsedPT = parsePTEmailBody(rawEmailBody);
        leadsToProcess.push(parsedPT);
      } else {
        // Fallback para parser BR
        const parsedBR = parsePortalEmail(rawEmailBody, emailSubject, emailFrom);
        const leadData = portalLeadToLeadData(parsedBR, activeImobId);
        leadsToProcess.push(leadData);
      }
    } else {
      // Standard IMAP fetch
      const result = await parseIncomingEmails({ test: isTest });
      leadsToProcess = result.leads.map(l => emailLeadToCreateData(l, activeImobId!));
      errors.push(...result.errors);
    }

    if (leadsToProcess.length === 0 && errors.length > 0) {
      return NextResponse.json({ error: 'Nenhum lead encontrado', details: errors }, { status: 500 });
    }

    const processed: string[] = [];
    const savedLeads: any[] = [];

    for (const data of leadsToProcess) {
      try {
        const moeda = data.moeda || (configPais === 'BR' ? 'BRL' : 'EUR');
        const leadData: Omit<Lead, 'id' | 'criado_em'> = {
          ...data,
          imobiliaria_id: activeImobId,
          status: data.status || 'novo',
          origem: data.origem || (configPais === 'BR' ? 'portal_email' : 'email_ego'),
          moeda,
          finalidade: data.finalidade || 'comprar',
        } as any;

        if (mock.isMockMode()) {
          mock.seedTestData();
          const lead = mock.createLead(leadData);
          savedLeads.push(lead);
          
          const { processLeadMockMode } = await import('@/lib/engine/processLeadMock');
          processLeadMockMode(lead).catch((err) => {
            console.error(`Erro ao processar lead ${lead.nome}:`, err);
          });

          processed.push(`${lead.nome} (${lead.portal_origem || 'Portal'})`);
        } else {
          // Production: insert into Supabase
          const { supabaseAdmin } = await import('@/lib/supabase');

          // De-duplication check by phone within tenant
          const { data: existing } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('imobiliaria_id', activeImobId)
            .eq('telefone', leadData.telefone)
            .maybeSingle();

          if (existing && !['vendido', 'descartado', 'finalizado'].includes(existing.status)) {
            console.log(`♻️ Ingest E-mail: Lead duplicado detectado (${leadData.telefone}). Atualizando lead ${existing.id}.`);
            
            const updatedDescricao = existing.descricao_interesse 
              ? `${existing.descricao_interesse}\n--- Novo Interesse E-mail (${data.portal_origem || 'Portal'}) ---\n${leadData.descricao_interesse || ''}`
              : leadData.descricao_interesse;

            const { data: updated } = await supabaseAdmin
              .from('leads')
              .update({
                descricao_interesse: updatedDescricao,
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
              titulo: `📧 Novo interesse via E-mail (${data.portal_origem || 'Portal'})`,
              descricao: `O lead demonstrou interesse em um imóvel via notificação de e-mail do portal: ${leadData.descricao_interesse || ''}`,
              data_hora: new Date().toISOString(),
              status: 'realizado'
            });

            if (updated) {
              savedLeads.push(updated);
              const { processLead } = await import('@/lib/engine/processLead');
              processLead(updated as Lead).catch((err) => {
                console.error(`Erro ao re-processar lead atualizado ${updated.nome}:`, err);
              });
            }

            processed.push(`${existing.nome} (Atualizado - ${data.portal_origem || 'Portal'})`);
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

          savedLeads.push(lead);

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
      data: savedLeads,
      errors: errors.filter(e => !e.includes('not yet implemented')),
    });
  } catch (err) {
    console.error('Erro na ingestão de e-mail:', err);
    return NextResponse.json({ error: 'Erro interno ao processar e-mails' }, { status: 500 });
  }
}
