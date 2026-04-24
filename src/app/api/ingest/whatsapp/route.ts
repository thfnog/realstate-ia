/**
 * POST /api/ingest/whatsapp — Universal WhatsApp Webhook
 * 
 * Supports Evolution API and Z-API.
 * Features: Multi-tenancy, Audio Transcription (IA), and Lead Processing.
 */

import { NextResponse } from 'next/server';
import * as mock from '@/lib/mockDb';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imobId = searchParams.get('imob_id');

    if (!imobId) {
      return NextResponse.json({ error: 'Faltando imob_id na URL' }, { status: 400 });
    }

    // 1. Security Validation
    const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (secret) {
      const authHeader = request.headers.get('x-webhook-secret') || request.headers.get('authorization');
      if (authHeader !== secret && authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    console.log(`\n💬 Webhook WhatsApp Recebido — imobId: ${imobId}`);

    // 3. Queue the webhook for async processing
    if (mock.isMockMode()) {
      // In mock mode, we keep the synchronous processing for simplicity in dev
      console.log('  🧪 Mock Mode: Processing synchronously...');
      return await handleSynchronousMockIngest(body, imobId);
    }

    // Production: INSERT INTO QUEUE
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { error: queueError } = await supabaseAdmin
      .from('webhook_ingestion_queue')
      .insert({
        imobiliaria_id: imobId,
        source: 'whatsapp',
        payload: body,
        status: 'pendente'
      });

    if (queueError) {
      console.error('❌ Erro ao enfileirar webhook:', queueError);
      return NextResponse.json({ error: 'Erro ao salvar na fila' }, { status: 500 });
    }

    console.log(`✅ Webhook enfileirado para processamento assíncrono.`);
    return NextResponse.json({ success: true, queued: true }, { status: 202 });

  } catch (err) {
    console.error('Erro no webhook de WhatsApp:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Legacy synchronous processing for Mock Mode
 */
async function handleSynchronousMockIngest(body: any, imobId: string) {
  // Normalize (simplified for mock)
  let senderName = 'Contato Mock';
  let phone = '';
  let messageText = '';
  let isFromMe = false;

  if (body.event === 'messages.upsert') {
    const data = body.data;
    senderName = data.pushName || senderName;
    phone = data.key.remoteJid?.split('@')[0] || '';
    isFromMe = data.key.fromMe || false;
    messageText = data.message?.conversation || data.message?.extendedTextMessage?.text || '';
  }

  if (isFromMe) return NextResponse.json({ status: 'ignored' });

  const leadData: any = {
    imobiliaria_id: imobId,
    nome: senderName,
    telefone: phone.startsWith('+') ? phone : `+${phone}`,
    origem: 'whatsapp',
    portal_origem: 'WhatsApp',
    moeda: 'BRL',
    descricao_interest: messageText,
    status: 'novo',
  };

  mock.seedTestData();
  const lead = mock.createLead(leadData);
  
  const { processLeadMockMode } = await import('@/lib/engine/processLeadMock');
  processLeadMockMode(lead).catch(err => console.error(err));

  return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
}
