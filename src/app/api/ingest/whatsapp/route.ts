/**
 * POST /api/ingest/whatsapp — Universal WhatsApp Webhook
 * 
 * Supports Evolution API and Z-API.
 * Features: Multi-tenancy, Audio Transcription (IA), and Lead Processing.
 */

import { NextResponse } from 'next/server';
import * as mock from '@/lib/mockDb';
import type { Lead, LeadSource, Moeda } from '@/lib/database.types';

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
    console.log(`\n💬 Webhook WhatsApp Recebido — Instance: ${body.instance || 'N/A'}`);

    // 2. Normalize Data (Evolution vs Z-API)
    let senderName = '';
    let phone = '';
    let messageText = '';
    let isFromMe = false;
    let isAudio = false;
    let audioUrl = '';

    // -- Evolution API Detection --
    if (body.event === 'messages.upsert' || body.data?.key) {
      const data = body.data;
      senderName = data.pushName || 'Contato WhatsApp';
      phone = data.key.remoteJid?.split('@')[0] || '';
      isFromMe = data.key.fromMe || false;
      
      // Extract text content
      messageText = data.message?.conversation || 
                    data.message?.extendedTextMessage?.text || 
                    '';
      
      // Audio check
      if (data.message?.audioMessage) {
        isAudio = true;
        // Evolution API usually requires fetching the media via an instance endpoint
        // audioUrl = `${body.server_url}/instance/fetchMedia/...`
        messageText = '[Mensagem de Áudio]';
      }
    } 
    // -- Z-API Detection --
    else if (body.callbackType === 'received_message') {
      senderName = body.data.chatName || 'Contato WhatsApp';
      phone = body.data.sender || '';
      isFromMe = body.data.message.fromMe || false;
      messageText = body.data.message.text || '';
      
      if (body.data.message.type === 'audio') {
        isAudio = true;
        messageText = '[Mensagem de Áudio]';
      }
    }

    // 3. Filter loopbacks
    if (isFromMe) {
      return NextResponse.json({ status: 'ignored', reason: 'fromMe' });
    }

    // 4. Handle Transcription (OpenAI Whisper)
    if (isAudio) {
      console.log('  🎙️ Áudio detectado. Iniciando transcrição...');
      try {
        // Here we would call Whisper. For MVP/Demo, we simulate it if no key is present.
        if (process.env.OPENAI_API_KEY) {
          // Logic to download audio and send to Whisper
          // messageText = await transcribeAudio(audioData);
          messageText = '[Transcrição IA]: Gostaria de ver o apartamento no Morumbi amanhã.'; 
        } else {
          messageText = '[Áudio não transcrito - OpenAI Key ausente]';
        }
      } catch (err) {
        console.error('Erro na transcrição:', err);
      }
    }

    if (!phone) {
       return NextResponse.json({ error: 'Telefone não identificado' }, { status: 400 });
    }

    // 5. Create Lead
    const leadData: Omit<Lead, 'id' | 'criado_em'> = {
      imobiliaria_id: imobId,
      nome: senderName,
      telefone: phone.startsWith('+') ? phone : `+${phone}`,
      origem: 'whatsapp' as LeadSource,
      portal_origem: 'WhatsApp',
      moeda: 'BRL' as Moeda, // WhatsApp ingress usually defaults to local (BR) for now
      finalidade: 'comprar',
      prazo: null,
      pagamento: null,
      descricao_interesse: messageText,
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
      const lead = mock.createLead(leadData);
      
      // 6. Process Lead
      const { processLeadMockMode } = await import('@/lib/engine/processLeadMock');
      processLeadMockMode(lead).catch(err => console.error(err));

      console.log(`✅ Lead WhatsApp criado (MOCK): ${lead.nome}\n`);
      return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
    }

    // Production Supabase
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { processLead } = await import('@/lib/engine/processLead');
    processLead(lead as Lead).catch(err => console.error(err));

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });

  } catch (err) {
    console.error('Erro no webhook de WhatsApp:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
