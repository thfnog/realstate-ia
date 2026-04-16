/**
 * POST /api/ingest/email — Trigger email ingestion (Portugal / eGO)
 *
 * Called manually or via cron. Reads unread emails, parses leads, and
 * triggers the processing pipeline for each one.
 *
 * Query params:
 *   ?test=true — run in mock/test mode
 */

import { NextResponse } from 'next/server';
import { parseIncomingEmails, emailLeadToCreateData } from '@/lib/ingest/emailParser';
import * as mock from '@/lib/mockDb';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isTest = searchParams.get('test') === 'true';

    console.log(`\n📧 Ingest Email — ${isTest ? 'TESTE' : 'PRODUÇÃO'}`);

    const result = await parseIncomingEmails({ test: isTest });

    if (result.errors.length > 0 && result.processed === 0) {
      return NextResponse.json(
        { error: 'Nenhum e-mail processado', details: result.errors },
        { status: 500 }
      );
    }

    // Process each parsed lead
    const processed: string[] = [];
    const errors: string[] = [...result.errors];

    for (const parsedLead of result.leads) {
      try {
        const leadData = emailLeadToCreateData(parsedLead);

        if (mock.isMockMode()) {
          mock.seedTestData();
          const lead = mock.createLead(leadData);
          
          // Trigger mock processing
          const { processLeadMockMode } = await import('@/lib/engine/processLeadMock');
          processLeadMockMode(lead).catch((err) => {
            console.error(`Erro ao processar lead ${lead.nome}:`, err);
          });

          processed.push(`${parsedLead.nome} (${parsedLead.portal_origem})`);
        } else {
          // Production: insert into Supabase
          const { supabaseAdmin } = await import('@/lib/supabase');
          const { data: lead, error } = await supabaseAdmin
            .from('leads')
            .insert(leadData)
            .select()
            .single();

          if (error) {
            errors.push(`Erro ao inserir ${parsedLead.nome}: ${error.message}`);
            continue;
          }

          const { processLead } = await import('@/lib/engine/processLead');
          processLead(lead).catch((err) => {
            console.error(`Erro ao processar lead ${lead.nome}:`, err);
          });

          processed.push(`${parsedLead.nome} (${parsedLead.portal_origem})`);
        }
      } catch (err) {
        errors.push(`Erro com ${parsedLead.nome}: ${String(err)}`);
      }
    }

    console.log(`✅ Email ingest: ${processed.length} processados, ${errors.length} erros\n`);

    return NextResponse.json({
      processed: processed.length,
      leads: processed,
      errors,
    });
  } catch {
    return NextResponse.json(
      { error: 'Erro interno ao processar e-mails' },
      { status: 500 }
    );
  }
}
