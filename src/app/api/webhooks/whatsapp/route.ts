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

    if ((event === 'messages.upsert' || event === 'messages_upsert') && payload.data) {
      const msgData = payload.data;
      // Evolution v2 can send message directly in data or inside a messages array
      const messageObj = msgData.message || (msgData.messages && msgData.messages[0]?.message);
      const key = msgData.key || (msgData.messages && msgData.messages[0]?.key);
      
      remoteJid = key?.remoteJid || '';
      
      // Outbound Message Detection: Move lead to 'Em Atendimento' if broker replies manually
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
          // Check if this is the bot's auto-reply to avoid premature status move
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

      // NOISE FILTER: Ignore messages from groups (@g.us)
      if (remoteJid.includes('@g.us')) {
        console.log(`🚫 Mensagem de grupo ignorada: ${remoteJid}`);
        return NextResponse.json({ success: true, status: 'skipped_group' });
      }

      sender = remoteJid.split('@')[0] || '';
      text = messageObj?.conversation || 
             messageObj?.extendedTextMessage?.text || 
             messageObj?.text ||
             msgData.messageContent || // Some v2 versions
             '';
      
      name = msgData.pushName || (msgData.messages && msgData.messages[0]?.pushName) || '';
    }

    if (!sender || !text) {
      console.log('⚠️ Payload incompleto ou evento não suportado:', payload.event);
      return NextResponse.json({ error: 'Payload incompleto' }, { status: 400 });
    }

    console.log(`📩 Nova mensagem de ${maskName(name)} (${maskPhone(sender)}): "${text.slice(0, 15)}..."`);

    // 2. Extração e Classificação via IA (Groq)
    const extracted = await extractLeadWithAI(text);

    // AI TRIAGE: If not a lead intent, skip creation
    if (extracted.is_lead === false) {
      console.log(`♻️ Ruído detectado e descartado: "${text.slice(0, 15)}..." (${extracted.resumo_ia})`);
      return NextResponse.json({ 
        success: true, 
        status: 'discarded_noise',
        reason: extracted.resumo_ia 
      });
    }

    // 3. Determinação da Imobiliária e Corretor via Instância
    let imobiliaria_id = mock.DEFAULT_IMOBILIARIA_ID;
    let fallback_corretor_id: string | null = null;
    
    // Tenta extrair corretor do nome da instância (realstate-iabroker-ID)
    const instanceMatch = instanceName?.match(/realstate-iabroker-(.+)/);
    if (instanceMatch) {
      const brokerId = instanceMatch[1];
      console.log(`🔍 Instância identificada como vinculada ao Corretor: ${brokerId}`);
      
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
        console.log(`✅ Atribuição direta: Imobiliária ${imobiliaria_id}, Corretor ${fallback_corretor_id}`);
      }
    }

    if (!mock.isMockMode() && !instanceMatch) {
       // Se não tem instância (ex: teste manual) e não é mock, busca a primeira imobiliária
       const { data: imobs } = await supabaseAdmin.from('imobiliarias').select('id').limit(1);
       if (imobs && imobs.length > 0) imobiliaria_id = imobs[0].id;
    }
     
    let config_pais = 'BR';
    if (mock.isMockMode()) {
       const imob = mock.getImobiliariaById(imobiliaria_id);
       config_pais = imob?.config_pais || 'BR';
    } else {
       const { data: imobData } = await supabaseAdmin.from('imobiliarias').select('config_pais').eq('id', imobiliaria_id).single();
       config_pais = imobData?.config_pais || 'BR';
    }

    let delaySec = 20;
    if (mock.isMockMode()) {
      const imob = mock.getImobiliariaById(imobiliaria_id);
      if (imob?.delay_auto_reply_sec !== undefined) delaySec = imob.delay_auto_reply_sec;
    } else {
      const { data: imob } = await supabaseAdmin.from('imobiliarias').select('delay_auto_reply_sec').eq('id', imobiliaria_id).single();
      if (imob?.delay_auto_reply_sec !== undefined) delaySec = imob.delay_auto_reply_sec;
    }

    const moeda = config_pais === 'BR' ? 'BRL' : 'EUR';
    
    // 4. Busca de Lead Existente ou Criação
    let lead;
    const phoneClean = sender.replace(/\D/g, '');

    if (mock.isMockMode()) {
       lead = mock.getLeadByTelefone(phoneClean);
    } else {
       const { data } = await supabaseAdmin.from('leads').select('*').eq('telefone', phoneClean).maybeSingle();
       lead = data;
    }

    if (lead) {
       console.log(`👤 Lead existente encontrado: ${maskName(lead.nome)}. Processando Inteligência de Follow-up...`);
       
       const aiResponse = await processFollowUpIntelligence(text, lead.corretor_id, imobiliaria_id);
       
       if (aiResponse) {
          console.log('🤖 IA de Agendamento sugerindo horários...');
          await processLead(lead, { 
            forceAutoReply: true, 
            customReply: aiResponse 
          });
          return NextResponse.json({ success: true, status: 'processed_scheduling_followup' });
       }

       return NextResponse.json({ success: true, status: 'processed_existing_lead_no_action' });
    }

    // 5. Detecção de Referência de Imóvel no Texto
    let imovel_id: string | null = null;
    const refMatch = text.match(/imóvel\s+([A-Z]{3,4}\d+)/i);
    if (refMatch) {
      const referencia = refMatch[1];
      console.log(`🔍 Referência de imóvel detectada na mensagem: ${referencia}`);
      
      let imovel;
      if (mock.isMockMode()) {
        imovel = mock.getImovelByReferencia(referencia);
      } else {
        const { data } = await supabaseAdmin.from('imoveis').select('id').eq('referencia', referencia).single();
        imovel = data;
      }
      
      if (imovel) {
        imovel_id = imovel.id;
        console.log(`🔗 Vínculo automático criado com o imóvel ID: ${imovel_id}`);
      }
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
      corretor_id: fallback_corretor_id, // Atribui ao corretor da instância
      status: 'novo',
      origem: 'whatsapp' as any,
      portal_origem: instanceName || 'WhatsApp Bot'
    };

    let newLead;
    if (mock.isMockMode()) {
       newLead = mock.createLead(leadData as any);
    } else {
       // Explicitly omit imovel_id from both insert and select to avoid production schema errors
       const { data, error } = await supabaseAdmin
        .from('leads')
        .insert([leadData])
        .select('*, imoveis(titulo, referencia)') // Agora com vínculo real
        .single();
       
       if (error) throw error;
       newLead = data;
    }

    // 6. Processamento Inteligente (Matching + Atribuição + Briefing)
    const processResult = await processLead(newLead, {
      skipAutoReply: extracted.is_lead !== true
    });

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
