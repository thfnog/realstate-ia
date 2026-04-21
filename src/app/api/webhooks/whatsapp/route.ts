import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractLeadWithAI } from '@/lib/engine/aiExtractor';
import { processLead } from '@/lib/engine/processLead';
import { processFollowUpIntelligence } from '@/lib/engine/aiScheduler';
import * as mock from '@/lib/mockDb';

/**
 * Webhook — WhatsApp Bot Entry Point
 */

const maskPhone = (p: string) => p ? p.replace(/^(\d{4})\d+(\d{4})$/, "$1****$2") : '***';
const maskName = (n: string) => {
  if (!n) return '***';
  const parts = n.split(' ');
  if (parts.length === 1) return n;
  return `${parts[0]} ${parts[1][0]}.`;
};

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    let sender = payload.sender;
    let text = payload.text;
    let name = payload.name;
    let instanceName = payload.instance;

    const event = payload.event?.toLowerCase() || '';
    let remoteJid = payload.data?.key?.remoteJid || '';
    
    console.log(`📡 Evento recebido: "${payload.event}" (Convertido: "${event}")`);
    
    // 1. WhatsApp Connection Status Synchronization
    if (event.includes('connection.update') || event.includes('status.instance') || event.includes('qrcode.updated')) {
      const state = payload.data?.state || payload.state;
      if (state && instanceName) {
        console.log(`🔌 Atualizando status da instância "${instanceName}" para: ${state}`);
        
        let internalStatus: 'open' | 'close' | 'connecting' = 'close';
        if (state === 'open' || state === 'CONNECTED') internalStatus = 'open';
        if (state === 'connecting' || state === 'CONNECTING') internalStatus = 'connecting';
        
        if (!mock.isMockMode()) {
          await supabaseAdmin
            .from('corretores')
            .update({ whatsapp_status: internalStatus })
            .eq('whatsapp_instance', instanceName);
        }
      }
      
      if (!event.includes('messages')) {
        return NextResponse.json({ success: true, status: 'connection_synced', state });
      }
    }

    // 2. Message Upsert Processing
    const isMessageEvent = (event === 'messages.upsert' || event === 'messages_upsert' || event === 'MESSAGES_UPSERT');

    if (isMessageEvent && payload.data) {
      const msgData = payload.data;
      const messageObj = msgData.message || (msgData.messages && msgData.messages[0]?.message);
      const key = msgData.key || (msgData.messages && msgData.messages[0]?.key);
      
      remoteJid = key?.remoteJid || '';
      
      // Outbound Message Detection
      if (key?.fromMe) {
        const phone = remoteJid.split('@')[0] || '';
        if (!phone) return NextResponse.json({ success: true, status: 'skipped_no_phone' });

        let lead;
        if (mock.isMockMode()) {
          lead = mock.getLeadByTelefone(phone);
        } else {
          const { data } = await supabaseAdmin.from('leads').select('*').eq('telefone', phone).single();
          lead = data;
        }

        if (lead && lead.status === 'novo') {
          const msgText = messageObj?.conversation || messageObj?.extendedTextMessage?.text || messageObj?.text || '';
          const isBotAutoReply = msgText.toLowerCase().includes('recebi seu interesse') || 
                                 msgText.toLowerCase().includes('recebi o seu contacto');

          if (!isBotAutoReply) {
            console.log(`📈 Lead ${maskName(lead.nome)} movido para 'em_atendimento' via resposta manual do corretor.`);
            if (mock.isMockMode()) {
              mock.updateLead(lead.id, { status: 'em_atendimento' });
            } else {
              await supabaseAdmin.from('leads').update({ status: 'em_atendimento' }).eq('id', lead.id);
            }
          }
        }
        return NextResponse.json({ success: true, status: 'processed_outbound' });
      }

      if (remoteJid.includes('@g.us')) {
        console.log(`🚫 Mensagem de grupo ignorada: ${remoteJid}`);
        return NextResponse.json({ success: true, status: 'skipped_group' });
      }

      sender = remoteJid.split('@')[0] || '';
      text = messageObj?.conversation || 
             messageObj?.extendedTextMessage?.text || 
             messageObj?.text ||
             msgData.messageContent || '';
      
      name = msgData.pushName || (msgData.messages && msgData.messages[0]?.pushName) || '';
    }

    if (!sender || !text) {
      console.log('⚠️ Payload incompleto ou evento não suportado:', payload.event);
      return NextResponse.json({ error: 'Payload incompleto' }, { status: 400 });
    }

    console.log(`📩 Nova mensagem de ${maskName(name)} (${maskPhone(sender)}): "${text.slice(0, 15)}..."`);

    const extracted = await extractLeadWithAI(text);

    if (extracted.is_lead === false) {
      console.log(`♻️ Ruído detectado e descartado: "${text.slice(0, 15)}..." (${extracted.resumo_ia})`);
      return NextResponse.json({ success: true, status: 'discarded_noise', reason: extracted.resumo_ia });
    }

    let imobiliaria_id = mock.DEFAULT_IMOBILIARIA_ID;
    let fallback_corretor_id: string | null = null;
    
    const instanceMatch = instanceName?.match(/realstate-iabroker-(.+)/);
    if (instanceMatch) {
      const brokerId = instanceMatch[1];
      let broker;
      if (mock.isMockMode()) {
        broker = mock.getCorretorById(brokerId);
      } else {
        const { data } = await supabaseAdmin.from('corretores').select('id, imobiliaria_id').eq('id', brokerId).single();
        broker = data;
      }

      if (broker) {
        imobiliaria_id = broker.imobiliaria_id;
        fallback_corretor_id = broker.id;
      }
    }

    if (!mock.isMockMode() && !instanceMatch) {
       const { data: imobs } = await supabaseAdmin.from('imobiliarias').select('id').limit(1);
       if (imobs && imobs.length > 0) imobiliaria_id = imobs[0].id;
    }
     
    let config_pais: 'PT' | 'BR' = 'BR';
    if (mock.isMockMode()) {
       const imob = mock.getImobiliariaById(imobiliaria_id);
       config_pais = (imob?.config_pais as 'PT' | 'BR') || 'BR';
    } else {
       const { data: imobData } = await supabaseAdmin.from('imobiliarias').select('config_pais').eq('id', imobiliaria_id).single();
       config_pais = (imobData?.config_pais as 'PT' | 'BR') || 'BR';
    }

    const moeda = config_pais === 'BR' ? 'BRL' : 'EUR';
    let lead;
    const phoneClean = sender.replace(/\D/g, '');

    if (mock.isMockMode()) {
       lead = mock.getLeadByTelefone(phoneClean);
    } else {
       const { data } = await supabaseAdmin.from('leads').select('*').eq('telefone', phoneClean).maybeSingle();
       lead = data;
    }

    if (lead) {
       const aiResponse = await processFollowUpIntelligence(text, lead.corretor_id, imobiliaria_id);
       if (aiResponse) {
          await processLead(lead, { forceAutoReply: true, customReply: aiResponse });
          return NextResponse.json({ success: true, status: 'processed_scheduling_followup' });
       }
       return NextResponse.json({ success: true, status: 'processed_existing_lead_no_action' });
    }

    let imovel_id: string | null = null;
    const refMatch = text.match(/imóvel\s+([A-Z]{3,4}\d+)/i);
    if (refMatch) {
      const referencia = refMatch[1];
      let imovel;
      if (mock.isMockMode()) {
        imovel = mock.getImovelByReferencia(referencia);
      } else {
        const { data } = await supabaseAdmin.from('imoveis').select('id').eq('referencia', referencia).single();
        imovel = data;
      }
      if (imovel) imovel_id = imovel.id;
    }

    const leadData = {
      imobiliaria_id,
      nome: name || extracted.nome || 'Lead WhatsApp',
      telefone: phoneClean,
      email: null,
      moeda,
      tipo_interesse: extracted.tipo_interesse || null,
      orcamento: extracted.orcamento || null,
      quartos_interesse: extracted.quartos || null,
      bairros_interesse: extracted.freguesia ? [extracted.freguesia] : [],
      descricao_interesse: text, 
      imovel_id,
      corretor_id: fallback_corretor_id,
      status: 'novo' as const,
      origem: 'whatsapp' as const,
      portal_origem: instanceName || 'WhatsApp Bot'
    };

    let newLead;
    if (mock.isMockMode()) {
       newLead = mock.createLead(leadData as any);
    } else {
       const { data, error } = await supabaseAdmin.from('leads').insert([leadData]).select('*, imoveis(titulo, referencia)').single();
       if (error) throw error;
       newLead = data;
    }

    const processResult = await processLead(newLead, { skipAutoReply: extracted.is_lead !== true });

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
