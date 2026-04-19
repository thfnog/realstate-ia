import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractLeadWithAI } from '@/lib/engine/aiExtractor';
import { processLead } from '@/lib/engine/processLead';
import * as mock from '@/lib/mockDb';

/**
 * Webhook — WhatsApp Bot Entry Point
 * 
 * Simula o recebimento de uma mensagem do WhatsApp Business API.
 * 
 * Exemplo de Payload POST:
 * {
 *   "sender": "+5511999990000",
 *   "text": "Olá, sou o Thiago e procuro uma casa em Indaiatuba Swiss Park até 2 milhões",
 *   "name": "Thiago Nogueira"
 * }
 */

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    let sender = payload.sender;
    let text = payload.text;
    let name = payload.name;
    let instanceName = payload.instance;

    // 1. Evolution API V2 — Extraction Logic
    if (payload.event === 'messages.upsert' && payload.data) {
      const msgData = payload.data;
      
      // Ignore messages sent by the bot itself to prevent loops
      if (msgData.key?.fromMe) {
        return NextResponse.json({ success: true, status: 'skipped_from_me' });
      }

      sender = msgData.key?.remoteJid?.split('@')[0] || '';
      text = msgData.message?.conversation || 
             msgData.message?.extendedTextMessage?.text || 
             msgData.message?.imageMessage?.caption || 
             '';
      name = msgData.pushName || '';
    }

    if (!sender || !text) {
      console.log('⚠️ Payload incompleto ou evento não suportado:', payload.event);
      return NextResponse.json({ error: 'Payload incompleto' }, { status: 400 });
    }

    console.log(`📩 Nova mensagem de ${name} (${sender}): "${text}"`);

    // 2. Extração de inteligência via IA (Groq)
    const extracted = await extractLeadWithAI(text);

    // 3. Determinação da Imobiliária
    let imobiliaria_id = mock.DEFAULT_IMOBILIARIA_ID;
    
    if (!mock.isMockMode()) {
       // Lookup imobiliaria by instance name in production
       // For now, using a fallback to the first imobiliaria if no mapping exists
       const { data: imobs } = await supabaseAdmin
         .from('imobiliarias')
         .select('id, config_pais')
         .limit(1);
       
       if (imobs && imobs.length > 0) {
         imobiliaria_id = imobs[0].id;
       }
    }
     
     // Determinar moeda com base no país da imobiliária
     const { data: imobData } = await supabaseAdmin
       .from('imobiliarias')
       .select('config_pais')
       .eq('id', imobiliaria_id)
       .single();
     const moeda = imobData?.config_pais === 'BR' ? 'BRL' : 'EUR';
    
    const leadData = {
      imobiliaria_id,
      nome: name || extracted.nome || 'Lead WhatsApp',
      telefone: sender.replace(/\D/g, ''), // Clean phone number
      email: null,
      moeda,
      tipo_interesse: extracted.tipo_interesse || null,
      orcamento: extracted.orcamento || null,
      quartos_interesse: extracted.quartos || null,
      bairros_interesse: extracted.freguesia ? [extracted.freguesia] : [],
      status: 'novo',
      origem: 'whatsapp' as any,
      portal_origem: instanceName || 'WhatsApp Bot'
    };

    let newLead;

    if (mock.isMockMode()) {
       newLead = mock.createLead(leadData as any);
    } else {
       const { data, error } = await supabaseAdmin
         .from('leads')
         .insert([leadData])
         .select()
         .single();
       if (error) throw error;
       newLead = data;
    }

    // 3. Processamento Inteligente (Matching + Atribuição + Briefing)
    const processResult = await processLead(newLead);

    return NextResponse.json({
      success: true,
      lead_id: newLead.id,
      extracted_profile: extracted,
      process: processResult
    });

  } catch (error: any) {
    console.error('❌ Erro no Webhook WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Handle GET for Webhook Verification (Meta requirements)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === 'imobia-token-123') {
    return new Response(challenge, { status: 200 });
  }
  
  return new Response('Verification failed', { status: 403 });
}
