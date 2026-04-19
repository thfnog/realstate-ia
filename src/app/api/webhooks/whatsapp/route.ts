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
    const { sender, text, name } = payload;

    if (!sender || !text) {
      return NextResponse.json({ error: 'Payload incompleto' }, { status: 400 });
    }

    // 1. Extração de inteligência via IA (Groq)
    const extracted = await extractLeadWithAI(text);

    // 2. Criação do Lead (Associa à imobiliária default no modo mock)
    const imobiliaria_id = mock.DEFAULT_IMOBILIARIA_ID;
    
    const leadData = {
      imobiliaria_id,
      nome: name || extracted.nome || 'Lead WhatsApp',
      telefone: sender,
      email: null,
      tipo_interesse: extracted.tipo_interesse || null,
      orcamento: extracted.orcamento || null,
      quartos_interesse: extracted.quartos || null,
      bairros_interesse: extracted.freguesia ? [extracted.freguesia] : [],
      status: 'novo',
      tags: ['whatsapp-bot', 'indaiatuba'],
      origem: 'whatsapp',
      portal_origem: 'Bot Direto'
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
