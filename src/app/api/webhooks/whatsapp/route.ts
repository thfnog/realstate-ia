import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractLeadWithAI } from '@/lib/engine/aiExtractor';
import { processLead } from '@/lib/engine/processLead';
import { processConversation, loadOrCreateState, shouldBotRespond } from '@/lib/engine/conversationEngine';
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
      let isTestMode = false;
      let explicitTest = false;
      let groupName = '';
      let imobiliaria_id = mock.DEFAULT_IMOBILIARIA_ID;
      let fallback_corretor_id: string | null = null;
      let instanceMatch: RegExpMatchArray | null = null;

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
        
        // Detailed logging for debugging fromMe issues
        console.log(`🔑 Key detectada:`, JSON.stringify(key));

        const fromMe = key?.fromMe === true || key?.fromMe === 'true' || key?.fromMe === 1;
        
        remoteJid = key?.remoteJid || '';

        // Extract text early to check for test keyword
        const tempText = messageObj?.conversation || messageObj?.extendedTextMessage?.text || messageObj?.text || '';
        if (tempText.toLowerCase().trim().startsWith('#testebot')) {
          isTestMode = true;
          explicitTest = true;
        }

        // --- EARLY BROKER RESOLUTION ---
        let broker;
        
        instanceMatch = instanceName?.match(/realstate-iabroker-(.+)/);
        if (instanceMatch) {
          const brokerId = instanceMatch[1];
          if (mock.isMockMode()) {
            broker = mock.getCorretorById(brokerId);
          } else {
            const { data } = await supabaseAdmin.from('corretores').select('id, imobiliaria_id, whatsapp_number').eq('id', brokerId).single();
            broker = data;
          }

          if (broker) {
            imobiliaria_id = broker.imobiliaria_id;
            fallback_corretor_id = broker.id;
          }
        }

        // AUTO TEST MODE: If chatting with self
        if (broker?.whatsapp_number && remoteJid.includes(broker.whatsapp_number.replace(/\D/g, ''))) {
          isTestMode = true;
        }

        if (isTestMode) {
          console.log(`🧪 MODO DE TESTE ATIVADO. JID: ${remoteJid}`);
        }
        
        // Outbound Message Detection: Ignore messages sent from our own instance (unless in test mode)
        if (fromMe && !isTestMode) {
          console.log(`📤 Mensagem de saída detectada (fromMe: true) para JID: ${remoteJid}. Ignorando processamento de lead.`);
          // Clean sender phone number (Evolution API sends @s.whatsapp.net or @g.us)
          // For messages to self, it might be the same number
          sender = remoteJid.split('@')[0] || '';
          if (sender.includes(':')) sender = sender.split(':')[0]; // Remove device/session suffix if present
          
          console.log(`📱 Remetente: ${sender} | Texto: "${tempText.slice(0, 50)}..." | fromMe: ${fromMe}`);
          const phone = sender;
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
        
        // 🔍 Resolve Sender (Handle Group Participants and LIDs)
        const participantJid = key?.participantAlt || key?.participant || '';
        
        if (isGroup) {
          // Attempt to get group name from various payload locations
          groupName = msgData.groupName || 
                      (msgData.messages && msgData.messages[0]?.groupName) || 
                      payload.data?.groupName || 
                      '';
          
          if (!participantJid) {
            console.log(`🚫 Mensagem de grupo ignorada (sem participante identificado): ${remoteJid}`);
            return;
          }

          // Prioritize real phone number over LID
          // LIDs usually contain ":", real phones in Evolution/WA usually don't or follow a specific pattern
          let rawSender = participantJid.split('@')[0] || '';
          if (rawSender.includes(':')) {
            // If it's a device suffix (e.g. 55119...:1), keep the phone
            // If it's a LID (e.g. 12345:1), this might still be wrong, but we'll try to sanitize
            rawSender = rawSender.split(':')[0];
          }
          
          sender = rawSender;
          console.log(`👥 Grupo: ${groupName || remoteJid} | Remetente: ${sender}`);
        } else {
          sender = remoteJid.split('@')[0] || '';
          if (sender.includes(':')) sender = sender.split(':')[0];
        }
        text = messageObj?.conversation || 
               messageObj?.extendedTextMessage?.text || 
               messageObj?.text ||
               msgData.messageContent || tempText || '';

        if (isTestMode) {
          text = text.replace(/#testebot/gi, '').trim();
          if (!text) text = 'Olá'; // Fallback if it was just the keyword
        }
        
        if (sender.includes(':')) sender = sender.split(':')[0];
        
        name = msgData.pushName || (msgData.messages && msgData.messages[0]?.pushName) || '';
        
        if (isTestMode) {
          console.log(`🧪 PROCESSO DE TESTE: Remetente=${sender}, Texto="${text}"`);
        } else if (broker?.whatsapp_number && remoteJid.includes(broker.whatsapp_number.replace(/\D/g, ''))) {
          isTestMode = true;
          console.log(`🧪 MODO DE TESTE AUTOMÁTICO (Chat Comigo Mesmo). JID: ${remoteJid}`);
        }
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
      if (shouldIgnoreMessage(text) && !isTestMode) {
        console.log(`♻️ Filtro Manual: Lixo detectado e descartado antes da IA.`);
        return;
      }

      // --- IMOBILIARIA RESOLUTION ---
      if (!mock.isMockMode() && !instanceMatch) {
         const { data: imobs } = await supabaseAdmin.from('imobiliarias').select('id').limit(1);
         if (imobs && imobs.length > 0) imobiliaria_id = imobs[0].id;
      }

      const extracted = await extractLeadWithAI(text, imobiliaria_id, isGroup ? 'group' : 'private');

      // Só descarta se a IA identificou como ruído real (não é lead e sem interesse real)
      if (extracted.is_lead === false && !isTestMode) {
        console.log(`♻️ Ruído detectado e descartado: "${text.slice(0, 15)}..." (${extracted.resumo_ia || 'Sem interesse'})`);
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
           message_text: isGroup ? `[Grupo] ${name || sender}: ${text}` : text,
           provider_id: payload.data?.key?.id
         });

          let skipAutoReply: boolean = isGroup;
          if (!skipAutoReply && instanceName && remoteJid) {
            const { hasPriorInteraction } = await import('@/lib/whatsapp');
            console.log(`[Webhook] Verificando interação prévia (Lead Existente) para ${remoteJid}...`);
            const hasHistory = isTestMode ? false : await hasPriorInteraction(instanceName, remoteJid);
            if (hasHistory) {
              console.log(`🕵️ Chat antigo detectado (Lead Existente) para ${sender}. Bot permanecerá em silêncio.`);
              skipAutoReply = true;
            } else {
              console.log(`✅ Chat novo confirmado (Lead Existente) para ${sender}. Procedendo com resposta do bot.`);
            }
          }

          // Fetch recent history for context
          const { data: history } = await supabaseAdmin
            .from('mensagens_historico')
            .select('direction, message_text, criado_em')
            .eq('lead_id', lead.id)
            .order('criado_em', { ascending: false })
            .limit(10);

          if (explicitTest && !mock.isMockMode()) {
             console.log(`🧹 Resetando state machine e histórico para teste explícito (#testebot)...`);
             await supabaseAdmin.from('conversation_state').delete().eq('lead_id', lead.id);
             await supabaseAdmin.from('mensagens_historico').delete().eq('lead_id', lead.id);
          }

          // Use unified Conversation Engine v2
          const convResult = await processConversation(text, lead, imobiliaria_id, history || []);

          if (convResult.shouldRespond && convResult.reply && !skipAutoReply && !isGroup) {
              await processLead(lead, { 
                forceAutoReply: true, 
                customReply: convResult.reply,
                skipAutoReply: false,
                forceIgnoreStatus: isTestMode,
                skipBriefing: true
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
        finalidade: (extracted.finalidade as any) || null,
        orcamento: extracted.orcamento || null,
        quartos_interesse: extracted.quartos || null,
        bairros_interesse: extracted.freguesia ? [extracted.freguesia] : [],
        descricao_interesse: text, 
        imovel_id,
        corretor_id: fallback_corretor_id,
        status: 'novo' as const,
        origem: 'whatsapp' as const,
        portal_origem: isGroup ? `WhatsApp Grupo: ${groupName || remoteJid.split('@')[0]}` : (instanceName || 'WhatsApp Bot')
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
        message_text: isGroup ? `[Grupo] ${name || sender}: ${text}` : text,
        provider_id: payload.data?.key?.id
      });

      // Se for um lead NOVO, verificar se já existe histórico real no WhatsApp (interação humana prévia)
      let skipAutoReply: boolean = extracted.is_lead !== true || isGroup;
      
      if (!skipAutoReply && instanceName && remoteJid) {
        const { hasPriorInteraction } = await import('@/lib/whatsapp');
        console.log(`[Webhook] Verificando interação prévia para ${remoteJid}...`);
        const hasHistory = isTestMode ? false : await hasPriorInteraction(instanceName, remoteJid);
        if (hasHistory) {
          console.log(`🕵️ Chat antigo detectado (Lead Novo) para ${sender}. Bot permanecerá em silêncio.`);
          skipAutoReply = true;
        } else {
          console.log(`✅ Chat novo confirmado para ${sender}. Procedendo com resposta do bot.`);
        }
      }

      // Use unified Conversation Engine v2 for new leads
      const { data: history } = await supabaseAdmin
        .from('mensagens_historico')
        .select('direction, message_text, criado_em')
        .eq('lead_id', newLead.id)
        .order('criado_em', { ascending: false })
        .limit(6);

      const convResult = await processConversation(text, newLead, imobiliaria_id, history || []);
      
      await processLead(newLead, { 
        skipAutoReply: skipAutoReply || !convResult.shouldRespond,
        customReply: convResult.reply || undefined,
        forceIgnoreStatus: isTestMode
      });
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
