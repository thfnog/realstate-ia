import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractLeadWithAI } from '@/lib/engine/aiExtractor';
import { processLead } from '@/lib/engine/processLead';
import { processFollowUpIntelligence } from '@/lib/engine/aiScheduler';
import { saveMessageToHistory } from '@/lib/whatsapp';
import * as mock from '@/lib/mockDb';
import { waitUntil } from '@vercel/functions';

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
    
    // 🚀 Return 200 OK immediately to WhatsApp Provider (Fast Ack)
    // The heavy work will happen in the background using waitUntil
    const execution = (async () => {
      let sender = payload.sender;
      let text = payload.text;
      let name = payload.name;
      let instanceName = payload.instance;
      let isGroup = false;

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
          if (!phone) return;

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

            // Persistence for outbound broker message
            await saveMessageToHistory({
              imobiliaria_id: lead.imobiliaria_id,
              lead_id: lead.id,
              corretor_id: lead.corretor_id,
              direction: 'outbound',
              message_text: msgText,
              status: 'sent',
              provider_id: key?.id
            });
          }
          return;
        }

        isGroup = remoteJid.includes('@g.us');
        const participantJid = key?.participant || '';
        
        if (isGroup) {
          if (!participantJid) {
            console.log(`🚫 Mensagem de grupo ignorada (sem participante identificado): ${remoteJid}`);
            return;
          }
          sender = participantJid.split('@')[0] || '';
          console.log(`👥 Mensagem de grupo detectada. Remetente: ${sender} (Grupo: ${remoteJid})`);
        } else {
          sender = remoteJid.split('@')[0] || '';
        }
        text = messageObj?.conversation || 
               messageObj?.extendedTextMessage?.text || 
               messageObj?.text ||
               msgData.messageContent || '';
        
        name = msgData.pushName || (msgData.messages && msgData.messages[0]?.pushName) || '';
      }

      const supportedEvents = ['messages.upsert', 'messages_upsert', 'messages_update', 'connection.update', 'status.instance', 'qrcode.updated'];
      
      if (!supportedEvents.some(se => event.includes(se.toLowerCase()))) {
         return;
      }

      if (!sender || !text) {
        return;
      }

      console.log(`📩 Nova mensagem de ${maskName(name)} (${maskPhone(sender)}): "${text.slice(0, 15)}..."`);

      const { shouldIgnoreMessage } = await import('@/lib/messageFilter');
      if (shouldIgnoreMessage(text)) {
        console.log(`♻️ Filtro Manual: Lixo detectado e descartado antes da IA.`);
        return;
      }

      // --- IMOBILIARIA RESOLUTION ---
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

      const extracted = await extractLeadWithAI(text, imobiliaria_id);

      // Salvaguarda: Se for apenas saudação e a IA não identificou interesse, descartamos como ruído
      const simpleGreetings = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'td bem', 'opa', 'blz', 'beleza'];
      const textClean = text.toLowerCase().trim().replace(/[?!.]/g, '');
      const isSimpleGreeting = textClean.length < 15 && simpleGreetings.includes(textClean);

      if (extracted.is_lead === false || (isSimpleGreeting && !extracted.tipo_interesse && !extracted.freguesia)) {
        console.log(`♻️ Ruído detectado e descartado: "${text.slice(0, 15)}..." (${extracted.resumo_ia || 'Saudação genérica'})`);
        return;
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
         // Check if lead name needs capture (starts with 'Lead #')
         if (lead.nome?.startsWith('Lead #')) {
           // Try to extract name from this new message
           const nameExtraction = await extractLeadWithAI(text, lead.imobiliaria_id);
           if (nameExtraction.nome && nameExtraction.nome.length > 1) {
             console.log(`✅ Nome capturado de lead pendente: "${nameExtraction.nome}"`);
             if (mock.isMockMode()) {
               mock.updateLead(lead.id, { nome: nameExtraction.nome });
             } else {
               await supabaseAdmin.from('leads').update({ nome: nameExtraction.nome }).eq('id', lead.id);
             }
             lead = { ...lead, nome: nameExtraction.nome };
           }
         }

         // Persist inbound message for existing lead
         await saveMessageToHistory({
           imobiliaria_id: lead.imobiliaria_id,
           lead_id: lead.id,
           corretor_id: lead.corretor_id,
           direction: 'inbound',
           message_text: isGroup ? `[Grupo: ${remoteJid.split('@')[0]}] ${text}` : text,
           provider_id: payload.data?.key?.id
         });

          let skipAutoReply = isGroup;
          if (!skipAutoReply && instanceName && remoteJid) {
            const { hasPriorInteraction } = await import('@/lib/whatsapp');
            const hasHistory = await hasPriorInteraction(instanceName, remoteJid);
            if (hasHistory) {
              console.log(`🕵️ Chat antigo detectado (Lead Existente) para ${sender}. Pulando saudação automática.`);
              skipAutoReply = true;
            }
          }

          const aiResponse = await processFollowUpIntelligence(text, lead.corretor_id, imobiliaria_id);
          if (aiResponse) {
              await processLead(lead, { 
                forceAutoReply: !skipAutoReply && !isGroup, 
                customReply: isGroup ? undefined : aiResponse,
                skipAutoReply: skipAutoReply || isGroup
              });
          }
          return;
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
        nome: name || extracted.nome || `Lead #${phoneClean.slice(-4)}`,
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
        portal_origem: isGroup ? `Grupo WhatsApp (${remoteJid.split('@')[0]})` : (instanceName || 'WhatsApp Bot')
      };

      let newLead;
      if (mock.isMockMode()) {
         newLead = mock.createLead(leadData as any);
      } else {
         // De-duplication: Check if active lead exists
         const { data: existing } = await supabaseAdmin
           .from('leads')
           .select('*')
           .eq('imobiliaria_id', imobiliaria_id)
           .eq('telefone', phoneClean)
           .maybeSingle();

         if (existing && !['vendido', 'descartado', 'finalizado'].includes(existing.status)) {
           console.log(`♻️ WhatsApp: Lead duplicado detectado (${phoneClean}). Atualizando lead ${existing.id}.`);
           
           // Merge fields
           const newBairros = Array.from(new Set([...(existing.bairros_interesse || []), ...(leadData.bairros_interesse || [])]));
           
           const { data: updated } = await supabaseAdmin
             .from('leads')
             .update({
               bairros_interesse: newBairros,
               descricao_interesse: `${existing.descricao_interesse || ''}\n--- Novo Contato WhatsApp ---\n${text}`,
               tipo_interesse: leadData.tipo_interesse || existing.tipo_interesse,
               orcamento: leadData.orcamento || existing.orcamento,
             })
             .eq('id', existing.id)
             .select()
             .single();

           // Add timeline event
           await supabaseAdmin.from('eventos').insert({
             imobiliaria_id,
             lead_id: existing.id,
             tipo: 'outro',
             titulo: `💬 Novo contato via WhatsApp`,
             descricao: `O lead enviou uma nova mensagem manifestando interesse.`,
             data_hora: new Date().toISOString(),
             status: 'realizado'
           });

           return NextResponse.json({ success: true, lead: updated, updated: true });
         }

         const { data, error } = await supabaseAdmin.from('leads').insert([leadData]).select('*, imoveis(titulo, referencia)').single();
         if (error) {
           console.error('Error inserting lead:', error);
           return NextResponse.json({ error: error.message }, { status: 500 });
         }
         newLead = data;
      }

      // Persist inbound message for new lead
      await saveMessageToHistory({
        imobiliaria_id: newLead.imobiliaria_id,
        lead_id: newLead.id,
        corretor_id: newLead.corretor_id,
        direction: 'inbound',
        message_text: isGroup ? `[Grupo: ${remoteJid.split('@')[0]}] ${text}` : text,
        provider_id: payload.data?.key?.id
      });

      // Se for um lead NOVO, verificar se já existe histórico real no WhatsApp (interação humana prévia)
      let skipAutoReply = extracted.is_lead !== true || isGroup;
      
      if (!skipAutoReply && instanceName && remoteJid) {
        const { hasPriorInteraction } = await import('@/lib/whatsapp');
        const hasHistory = await hasPriorInteraction(instanceName, remoteJid);
        if (hasHistory) {
          console.log(`🕵️ Chat antigo detectado (Lead Novo) para ${sender}. Pulando saudação automática.`);
          skipAutoReply = true;
        }
      }

      await processLead(newLead, { skipAutoReply });
    })();

    // Non-blocking background task
    waitUntil(execution);

    return NextResponse.json({ success: true, status: 'acknowledged' });

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
