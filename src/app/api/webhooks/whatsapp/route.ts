import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractLeadWithAI } from '@/lib/engine/aiExtractor';
import { processLead } from '@/lib/engine/processLead';
import { processConversation } from '@/lib/engine/conversationEngine';
import { saveMessageToHistory, downloadMedia, sendWhatsAppMessage } from '@/lib/whatsapp';
import { transcribeAudio } from '@/lib/engine/audioTranscriber';
import { classifyLead } from '@/lib/engine/leadClassifier';
import { getParceiroRepository, getOportunidadeRepository } from '@/lib/repositories/factory';
import { assignCorretor } from '@/lib/engine/assignCorretor';
import { HITLManager } from '@/lib/engine/hitlManager';
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
      let broker: any = null;

      // Audio variables
      let media_type = 'text';
      let media_url: string | null = null;
      let transcricao: string | null = null;
      let transcricao_confianca: number | null = null;
      let duracao_segundos: number | null = null;

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
        const messageContainer = msgData.messages && msgData.messages[0] ? msgData.messages[0] : msgData;
        const messageObj = messageContainer?.message;
        const key = messageContainer?.key;
        
        console.log(`🔑 Key detectada:`, JSON.stringify(key));

        const fromMe = key?.fromMe === true || key?.fromMe === 'true' || key?.fromMe === 1;
        remoteJid = key?.remoteJid || '';

        // Extract text early to check for test keyword
        const tempText = messageObj?.conversation || messageObj?.extendedTextMessage?.text || messageObj?.text || '';
        if (tempText.toLowerCase().trim().startsWith('#testebot')) {
          isTestMode = true;
          const pureCommand = tempText.toLowerCase().trim();
          if (pureCommand === '#testebot' || pureCommand === '#testebot reset') {
            explicitTest = true;
          }
        }

        // --- EARLY BROKER RESOLUTION ---
        instanceMatch = instanceName?.match(/realstate-iabroker-(.+)/);
        if (instanceMatch) {
          const brokerId = instanceMatch[1];
          if (mock.isMockMode()) {
            broker = mock.getCorretorById(brokerId);
          } else {
            const { data } = await supabaseAdmin.from('corretores').select('id, imobiliaria_id, whatsapp_number, nome, telefone').eq('id', brokerId).single();
            broker = data;
          }

          if (broker) {
            imobiliaria_id = broker.imobiliaria_id;
            fallback_corretor_id = broker.id;
          }
        }

        // --- IMOBILIARIA RESOLUTION ---
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

        // AUTO TEST MODE: If chatting with self
        if (broker?.whatsapp_number && remoteJid.includes(broker.whatsapp_number.replace(/\D/g, ''))) {
          isTestMode = true;
        }

        if (isTestMode) {
          console.log(`🧪 MODO DE TESTE ATIVADO. JID: ${remoteJid}`);
        }

        isGroup = remoteJid.includes('@g.us');
        const participantJid = key?.participantAlt || key?.participant || '';
        
        if (isGroup) {
          groupName = msgData.groupName || 
                      (msgData.messages && msgData.messages[0]?.groupName) || 
                      payload.data?.groupName || 
                      '';
          
          if (!participantJid) {
            console.log(`🚫 Mensagem de grupo ignorada (sem participante identificado): ${remoteJid}`);
            return;
          }

          let rawSender = participantJid.split('@')[0] || '';
          if (rawSender.includes(':')) {
            rawSender = rawSender.split(':')[0];
          }
          sender = rawSender;
          console.log(`👥 Grupo: ${groupName || remoteJid} | Remetente: ${sender}`);
        } else {
          sender = remoteJid.split('@')[0] || '';
          if (sender.includes(':')) sender = sender.split(':')[0];
        }

        // Outbound Message Detection: Ignore messages sent from our own instance (unless in test mode)
        if (fromMe && !isTestMode) {
          console.log(`📤 Mensagem de saída detectada (fromMe: true) para JID: ${remoteJid}. Ignorando processamento de lead.`);
          sender = remoteJid.split('@')[0] || '';
          if (sender.includes(':')) sender = sender.split(':')[0];
          
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

        // Text parsing or AUDIO transcription
        const audioMsg = messageObj?.audioMessage;
        if (audioMsg) {
          const seconds = audioMsg.seconds || 0;
          if (seconds > 300) {
            console.log(`⏳ Áudio muito longo (${seconds}s). Enviando aviso e abortando.`);
            await sendWhatsAppMessage(
              remoteJid.split('@')[0],
              "Desculpe, só consigo processar áudios de até 5 minutos. Pode enviar um áudio mais curto ou digitar?",
              instanceName,
              config_pais
            );
            return;
          }

          console.log(`🎙️ Baixando áudio de ${sender}...`);
          const downloaded = await downloadMedia(instanceName, messageContainer);
          if (!downloaded) {
            console.error("❌ Falha ao baixar áudio da Evolution API.");
            await sendWhatsAppMessage(
              remoteJid.split('@')[0],
              "Não consegui processar seu áudio. Pode digitar sua mensagem por favor?",
              instanceName,
              config_pais
            );
            return;
          }

          console.log(`🎙️ Transcrevendo áudio...`);
          const result = await transcribeAudio(downloaded.base64, downloaded.mimeType, imobiliaria_id);
          if (!result || !result.text) {
            console.error("❌ Falha na transcrição do áudio.");
            await sendWhatsAppMessage(
              remoteJid.split('@')[0],
              "Desculpe, não consegui compreender o áudio. Pode tentar digitar?",
              instanceName,
              config_pais
            );
            return;
          }

          text = result.text;
          console.log(`🎙️ Transcrição concluída: "${text}"`);
          
          media_type = 'audio';
          media_url = audioMsg.url || null;
          transcricao = result.text;
          transcricao_confianca = result.confidence;
          duracao_segundos = seconds;
        } else {
          const imageMsg = messageObj?.imageMessage;
          if (imageMsg) {
            media_type = 'image';
            media_url = imageMsg.url || null;
            if (imageMsg.caption && !text) {
              text = imageMsg.caption;
            }
          }

          text = text || 
                 messageObj?.conversation || 
                 messageObj?.extendedTextMessage?.text || 
                 messageObj?.text ||
                 msgData.messageContent || tempText || '';
        }

        if (isTestMode) {
          text = text.replace(/#testebot/gi, '').trim();
          if (!text) text = 'Olá';
        }
        
        if (sender.includes(':')) sender = sender.split(':')[0];
        name = msgData.pushName || (msgData.messages && msgData.messages[0]?.pushName) || '';
      }

      const supportedEvents = ['messages.upsert', 'messages_upsert', 'messages_update', 'connection.update', 'status.instance', 'qrcode.updated'];
      if (!supportedEvents.some(se => event.includes(se.toLowerCase()))) {
         return;
      }

      if (!sender || !text) {
        return;
      }

      console.log(`📩 Nova mensagem de ${maskName(name)} (${maskPhone(sender)}): "${text.slice(0, 30)}..."`);

      const { shouldIgnoreMessage } = await import('@/lib/messageFilter');
      if (shouldIgnoreMessage(text) && !isTestMode) {
        console.log(`♻️ Filtro Manual: Lixo detectado e descartado antes da IA.`);
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

      const phoneClean = sender.replace(/\D/g, '');

      // --- HITL BROKER APPROVAL INTERCEPTOR ---
      const hitlResult = await HITLManager.checkAndProcessBrokerReply(phoneClean, text, config_pais);
      if (hitlResult.handled) {
        console.log(`🛡️ [HITL] Comando do corretor processado para ${phoneClean}: ${hitlResult.message}`);
        return;
      }

      // --- MOTOR DE CAPTAÇÃO DE IMÓVEIS (CORRETORES / WHATSAPP) ---
      const isExplicitCaptar = text.toLowerCase().trim().startsWith('#captar');
      const isCaptarIntent = /\b(captei\s+(um|uma|novo|nova)|cadastrar\s+im[oó]vel|cadastrar\s+imovel|novo\s+im[oó]vel|novo\s+imovel|capta[cç][aã]o\s+de\s+im[oó]vel|capta[cç][aã]o\s+de\s+imovel|cadastrar\s+(casa|apto|apartamento|cobertura|terreno|imovel|sala)|quero\s+cadastrar\s+um\s+im[oó]vel)\b/i.test(text);

      // Verificar se o remetente é um corretor cadastrado
      let corretorCadastrado = broker;
      if (!corretorCadastrado && phoneClean) {
        if (mock.isMockMode()) {
          const corretores = mock.getCorretores(imobiliaria_id);
          corretorCadastrado = corretores.find(c => c.telefone.replace(/\D/g, '') === phoneClean || (c.whatsapp_number && c.whatsapp_number.replace(/\D/g, '') === phoneClean));
        } else {
          const { data: cData } = await supabaseAdmin
            .from('corretores')
            .select('id, imobiliaria_id, nome, telefone, whatsapp_number')
            .eq('imobiliaria_id', imobiliaria_id)
            .or(`telefone.ilike.%${phoneClean}%,whatsapp_number.ilike.%${phoneClean}%`)
            .maybeSingle();
          corretorCadastrado = cData;
        }
      }

      if (isExplicitCaptar || (corretorCadastrado && isCaptarIntent) || (isCaptarIntent && text.length >= 30)) {
        console.log(`🏗️ [Captação] Detectada captação de imóvel por ${corretorCadastrado?.nome || name || phoneClean}`);
        
        const { processCaptacao } = await import('@/lib/engine/captacaoEngine');
        const cleanText = text.replace(/^#captar\s*/i, '').trim();
        const mediaUrls = media_url ? [media_url] : [];

        try {
          const captacaoResult = await processCaptacao({
            text: cleanText || text,
            audioTranscription: transcricao,
            mediaUrls,
            corretor_id: corretorCadastrado?.id || fallback_corretor_id || null,
            corretor_nome: corretorCadastrado?.nome || name || null,
            imobiliaria_id,
            config_pais
          });

          if (captacaoResult.success) {
            console.log(`🚀 [Captação] Imóvel cadastrado com sucesso! Enviando retorno para ${phoneClean}...`);
            await sendWhatsAppMessage(phoneClean, captacaoResult.replyMessage, instanceName, config_pais);
            return;
          }
        } catch (captErr: any) {
          console.error('❌ Erro ao processar captação no webhook:', captErr);
          await sendWhatsAppMessage(
            phoneClean,
            `⚠️ Ocorreu uma instabilidade ao processar a captação do imóvel. Nossa equipe foi notificada.`,
            instanceName,
            config_pais
          );
          return;
        }
      }

      // --- INTERCEPTOR DE CONFIRMAÇÃO / REAGENDAMENTO DE VISITAS ---
      const normalizedText = text.toLowerCase().trim().replace(/[.,!?:;]/g, '');
      const isConfirmIntent = normalizedText === '1' || 
                              normalizedText === '1 confirmar' || 
                              normalizedText === 'confirmar' || 
                              normalizedText === 'confirmado' || 
                              normalizedText === 'confirmada' || 
                              normalizedText === 'confirmo' || 
                              /^(sim|vou|vou sim|estou a caminho|confirmad[oa]|com certeza|ok|confirmar visita|pode confirmar)$/i.test(normalizedText);

      const isRescheduleIntent = normalizedText === '2' || 
                                normalizedText === '2 reagendar' || 
                                normalizedText === 'reagendar' || 
                                normalizedText === 'reagendamento' || 
                                /^(n[aã]o posso|desmarcar|remarcar|outro dia|cancelar|n[aã]o vou conseguir|nao vou|nao posso hoje|preciso remarcar)$/i.test(normalizedText);

      if (isConfirmIntent || isRescheduleIntent) {
        let currentLead = null;
        if (mock.isMockMode()) {
          currentLead = mock.getLeadByTelefone(phoneClean);
        } else {
          const { data: lData } = await supabaseAdmin
            .from('leads')
            .select('*, corretores(*)')
            .eq('telefone', phoneClean)
            .eq('imobiliaria_id', imobiliaria_id)
            .maybeSingle();
          currentLead = lData;
        }

        if (currentLead) {
          let pendingVisit: any = null;
          if (mock.isMockMode()) {
            const evts = mock.getEventos(currentLead.id);
            pendingVisit = evts.find(e => e.tipo === 'visita' && ['agendado', 'confirmado', 'reagendamento_solicitado'].includes(e.status));
          } else {
            const { data: vData } = await supabaseAdmin
              .from('eventos')
              .select('*, corretor:corretores(*)')
              .eq('lead_id', currentLead.id)
              .eq('tipo', 'visita')
              .in('status', ['agendado', 'confirmado', 'reagendamento_solicitado'])
              .order('data_hora', { ascending: true })
              .limit(1)
              .maybeSingle();
            pendingVisit = vData;
          }

          if (pendingVisit) {
            const corretorObj = pendingVisit.corretor || currentLead.corretores || broker;
            const leadFirstName = currentLead.nome ? currentLead.nome.split(' ')[0] : 'Cliente';
            const visitTime = new Date(pendingVisit.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            if (isConfirmIntent) {
              console.log(`✅ [Visita] Visita confirmada pelo lead ${currentLead.nome} para ${pendingVisit.data_hora}`);
              if (mock.isMockMode()) {
                mock.updateEvento(pendingVisit.id, { status: 'confirmado' });
              } else {
                await supabaseAdmin
                  .from('eventos')
                  .update({ status: 'confirmado' })
                  .eq('id', pendingVisit.id);
              }

              const replyLead = `✅ Perfeito, *${leadFirstName}*! Sua visita às *${visitTime}* está *CONFIRMADA*. Nos vemos lá! 🏠`;
              await sendWhatsAppMessage(phoneClean, replyLead, instanceName, config_pais);

              if (corretorObj?.telefone) {
                const notifyCorretor = `✅ *Visita Confirmada!*\n\nO cliente *${currentLead.nome}* confirmou a visita de hoje às *${visitTime}* no imóvel *${pendingVisit.titulo}*.\nTelefone do cliente: ${phoneClean}`;
                await sendWhatsAppMessage(corretorObj.telefone, notifyCorretor, corretorObj.whatsapp_instance || undefined, config_pais);
              }

              await saveMessageToHistory({
                imobiliaria_id,
                lead_id: currentLead.id,
                corretor_id: corretorObj?.id || null,
                direction: 'inbound',
                message_text: text,
                media_type,
                media_url,
                transcricao,
                transcricao_confianca,
                duracao_segundos
              });

              await saveMessageToHistory({
                imobiliaria_id,
                lead_id: currentLead.id,
                corretor_id: corretorObj?.id || null,
                direction: 'outbound',
                message_text: replyLead,
                is_bot: true
              });

              return;
            } else if (isRescheduleIntent) {
              console.log(`⚠️ [Visita] Reagendamento solicitado pelo lead ${currentLead.nome} para ${pendingVisit.data_hora}`);
              if (mock.isMockMode()) {
                mock.updateEvento(pendingVisit.id, { status: 'reagendamento_solicitado' });
              } else {
                await supabaseAdmin
                  .from('eventos')
                  .update({ status: 'reagendamento_solicitado' })
                  .eq('id', pendingVisit.id);
              }

              const replyLead = `⚠️ Entendido, *${leadFirstName}*. Registramos sua solicitação de reagendamento. Nosso corretor entrará em contato em breve para propor novos horários!`;
              await sendWhatsAppMessage(phoneClean, replyLead, instanceName, config_pais);

              if (corretorObj?.telefone) {
                const notifyCorretor = `⚠️ *Solicitação de Reagendamento!*\n\nO cliente *${currentLead.nome}* solicitou o reagendamento da visita das *${visitTime}* no imóvel *${pendingVisit.titulo}*.\nPor favor, entre em contato para alinhar uma nova data.\nTelefone do cliente: ${phoneClean}`;
                await sendWhatsAppMessage(corretorObj.telefone, notifyCorretor, corretorObj.whatsapp_instance || undefined, config_pais);
              }

              await saveMessageToHistory({
                imobiliaria_id,
                lead_id: currentLead.id,
                corretor_id: corretorObj?.id || null,
                direction: 'inbound',
                message_text: text,
                media_type,
                media_url,
                transcricao,
                transcricao_confianca,
                duracao_segundos
              });

              await saveMessageToHistory({
                imobiliaria_id,
                lead_id: currentLead.id,
                corretor_id: corretorObj?.id || null,
                direction: 'outbound',
                message_text: replyLead,
                is_bot: true
              });

              return;
            }
          }
        }
      }

      // --- CLASSIFICATION & AGENT DETECTION ---
      const classification = await classifyLead(text, imobiliaria_id);
      console.log(`🏷️ Classificação da IA: ${classification.classificacao} (${classification.confianca.toFixed(2)}) - ${classification.motivo}`);

      if (classification.classificacao === 'corretor_parceiro' && classification.confianca >= 0.8) {
        console.log(`🤝 Contato identificado como Corretor Parceiro. Iniciando desvio...`);
        
        const parceiroRepo = getParceiroRepository(supabaseAdmin);
        let parceiro = await parceiroRepo.findByTelefone(phoneClean, imobiliaria_id);
        
        if (!parceiro) {
          parceiro = await parceiroRepo.create({
            imobiliaria_id,
            nome: name || `Corretor Parceiro #${phoneClean.slice(-4)}`,
            telefone: phoneClean,
            ativo: true,
            total_negocios: 0,
            notas: `Identificado automaticamente via bot. Mensagem inicial: "${text}"`
          });
          console.log(`🤝 Parceiro criado: ${parceiro.nome}`);
        }

        const corretorPlantao = await assignCorretor(imobiliaria_id);
        const corretorId = corretorPlantao?.id || fallback_corretor_id;

        const oportRepo = getOportunidadeRepository(supabaseAdmin);
        const oport = await oportRepo.create({
          imobiliaria_id,
          parceiro_id: parceiro.id,
          corretor_id: corretorId,
          tipo: 'parceria_venda',
          titulo: `🤝 Parceria proposta por ${parceiro.nome}`,
          descricao: `Mensagem inicial:\n"${text}"\n\nIdentificação da IA:\nConfiança: ${classification.confianca}\nMotivo: ${classification.motivo}`,
          status: 'nova'
        });
        console.log(`🤝 Oportunidade de parceria criada: ${oport.id}`);

        const msgAgradecimento = config_pais === 'BR'
          ? `Olá! Agradecemos a sua mensagem de parceria. Registramos o seu contato no nosso sistema de parcerias e um corretor da nossa equipe entrará em contato em breve para alinharmos.`
          : `Olá! Agradecemos a sua mensagem de parceria. Registámos o seu contacto no nosso sistema de parcerias e um consultor da nossa equipa entrará em contacto em breve para alinharmos.`;

        await sendWhatsAppMessage(phoneClean, msgAgradecimento, instanceName, config_pais);

        // Se houver um lead ativo para esse telefone, marca como descartado
        if (!mock.isMockMode()) {
          const { data: existingLead } = await supabaseAdmin
            .from('leads')
            .select('id')
            .eq('telefone', phoneClean)
            .eq('imobiliaria_id', imobiliaria_id)
            .neq('status', 'descartado')
            .maybeSingle();

          if (existingLead) {
            await supabaseAdmin
              .from('leads')
              .update({
                status: 'descartado',
                classificacao: 'corretor_parceiro',
                classificacao_confianca: classification.confianca,
                classificacao_motivo: `Movido para parceiros. Oportunidade: ${oport.id}`
              })
              .eq('id', existingLead.id);
            
            await saveMessageToHistory({
              imobiliaria_id,
              lead_id: existingLead.id,
              corretor_id: corretorId,
              direction: 'inbound',
              message_text: text,
              media_type,
              media_url,
              transcricao,
              transcricao_confianca,
              duracao_segundos
            });
          }
        }
        return;
      }

      // --- REGULAR LEAD FLOW ---
      const extracted = await extractLeadWithAI(text, imobiliaria_id, isGroup ? 'group' : 'private');

      if (extracted.is_lead === false && !isTestMode) {
        console.log(`♻️ Ruído detectado e descartado: "${text.slice(0, 15)}..." (${extracted.resumo_ia || 'Sem interesse'})`);
        return;
      }

      const moeda = config_pais === 'BR' ? 'BRL' : 'EUR';
      let lead;

      if (mock.isMockMode()) {
         lead = mock.getLeadByTelefone(phoneClean);
      } else {
         const { data } = await supabaseAdmin.from('leads').select('*').eq('telefone', phoneClean).maybeSingle();
         lead = data;
      }

      // Se for grupo, achar o corretor de plantão
      let corretorPlantao = null;
      if (isGroup && !mock.isMockMode()) {
        corretorPlantao = await assignCorretor(imobiliaria_id);
      }

      if (lead) {
         if (lead.nome?.startsWith('Lead #')) {
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

         await saveMessageToHistory({
           imobiliaria_id: lead.imobiliaria_id,
           lead_id: lead.id,
           corretor_id: lead.corretor_id,
           direction: 'inbound',
           message_text: isGroup ? `[Grupo] ${name || sender}: ${text}` : text,
           provider_id: payload.data?.key?.id,
           media_type,
           media_url,
           transcricao,
           transcricao_confianca,
           duracao_segundos
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

          const leadUpdates: any = {
            classificacao: classification.classificacao,
            classificacao_confianca: classification.confianca,
            classificacao_motivo: classification.motivo
          };

          if (extracted.tipo_interesse && !lead.tipo_interesse) leadUpdates.tipo_interesse = extracted.tipo_interesse;
          if (extracted.quartos && !lead.quartos_interesse) leadUpdates.quartos_interesse = extracted.quartos;
          if (extracted.orcamento && !lead.orcamento) leadUpdates.orcamento = extracted.orcamento;
          if (extracted.finalidade && !lead.finalidade) leadUpdates.finalidade = extracted.finalidade;
          if (extracted.freguesia) {
              const bairros = lead.bairros_interesse || [];
              if (!bairros.includes(extracted.freguesia)) leadUpdates.bairros_interesse = [...bairros, extracted.freguesia];
          }
          if (Object.keys(leadUpdates).length > 0) {
              console.log(`🧠 Atualizando contexto do lead existente com novos dados:`, leadUpdates);
              if (!mock.isMockMode()) {
                 await supabaseAdmin.from('leads').update(leadUpdates).eq('id', lead.id);
              }
              Object.assign(lead, leadUpdates);
          }

          // Notificar corretor se originado de grupo (lead existente mas re-enviando em grupo)
          if (isGroup && corretorPlantao && !mock.isMockMode()) {
            const { data: usuario } = await supabaseAdmin
              .from('usuarios')
              .select('id')
              .eq('corretor_id', corretorPlantao.id)
              .maybeSingle();

            if (usuario) {
              await supabaseAdmin.from('notificacoes').insert([{
                imobiliaria_id,
                usuario_id: usuario.id,
                titulo: `👥 Lead no Grupo: ${groupName}`,
                mensagem: `O lead ${lead.nome} enviou uma mensagem no grupo "${groupName}".`,
                tipo: 'lead',
                link: `/admin/crm?lead_id=${lead.id}`
              }]);
            }

            const alertMsg = `⚠️ *Alerta de Plantão (Grupo)*: O lead ${lead.nome} mandou mensagem no grupo *${groupName}*.\nMensagem: "${text.slice(0, 100)}..."`;
            await sendWhatsAppMessage(corretorPlantao.telefone, alertMsg, undefined, config_pais);
          }

          const convResult = await processConversation(text, lead, imobiliaria_id, history || [], broker?.nome);

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
        corretor_id: fallback_corretor_id || (isGroup ? corretorPlantao?.id : null),
        status: 'novo' as const,
        origem: 'whatsapp' as const,
        portal_origem: isGroup ? `WhatsApp Grupo: ${groupName || remoteJid.split('@')[0]}` : (instanceName || 'WhatsApp Bot'),
        grupo_nome: isGroup ? groupName : null,
        grupo_jid: isGroup ? remoteJid : null,
        classificacao: classification.classificacao,
        classificacao_confianca: classification.confianca,
        classificacao_motivo: classification.motivo
      };

      let newLead;
      if (mock.isMockMode()) {
         newLead = mock.createLead(leadData as any);
      } else {
         const { data: existing } = await supabaseAdmin
           .from('leads')
           .select('*')
           .eq('imobiliaria_id', imobiliaria_id)
           .eq('telefone', phoneClean)
           .maybeSingle();

         if (existing && !['vendido', 'descartado', 'finalizado'].includes(existing.status)) {
           console.log(`♻️ WhatsApp: Lead duplicado detectado (${phoneClean}). Atualizando lead ${existing.id}.`);
           
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

      await saveMessageToHistory({
        imobiliaria_id: newLead.imobiliaria_id,
        lead_id: newLead.id,
        corretor_id: newLead.corretor_id,
        direction: 'inbound',
        message_text: isGroup ? `[Grupo] ${name || sender}: ${text}` : text,
        provider_id: payload.data?.key?.id,
        media_type,
        media_url,
        transcricao,
        transcricao_confianca,
        duracao_segundos
      });

      // Criar notificações para lead de grupo (novo lead)
      if (isGroup && corretorPlantao && !mock.isMockMode()) {
        const { data: usuario } = await supabaseAdmin
          .from('usuarios')
          .select('id')
          .eq('corretor_id', corretorPlantao.id)
          .maybeSingle();

        if (usuario) {
          await supabaseAdmin.from('notificacoes').insert([{
            imobiliaria_id,
            usuario_id: usuario.id,
            titulo: `👥 Novo Lead de Grupo: ${groupName}`,
            mensagem: `Lead ${newLead.nome} de ${phoneClean} entrou pelo grupo "${groupName}".`,
            tipo: 'lead',
            link: `/admin/crm?lead_id=${newLead.id}`
          }]);
          console.log(`🔔 Notificação de novo lead de grupo criada no painel para ${corretorPlantao.nome}`);
        }

        const alertMsg = `⚠️ *Alerta de Plantão (Grupo)*: Um novo lead (${newLead.nome}) foi recebido no grupo *${groupName}*.\nTelefone do lead: ${phoneClean}\nMensagem: "${text.slice(0, 100)}..."\n\nAcesse o painel do CRM para acompanhar.`;
        await sendWhatsAppMessage(corretorPlantao.telefone, alertMsg, undefined, config_pais);
      }

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

      const { data: history } = await supabaseAdmin
        .from('mensagens_historico')
        .select('direction, message_text, criado_em')
        .eq('lead_id', newLead.id)
        .order('criado_em', { ascending: false })
        .limit(6);

      const convResult = await processConversation(text, newLead, imobiliaria_id, history || [], broker?.nome);
      
      await processLead(newLead, { 
        skipAutoReply: skipAutoReply || !convResult.shouldRespond,
        customReply: convResult.reply || undefined,
        forceIgnoreStatus: isTestMode
      });
    })();

    waitUntil(execution);
    return NextResponse.json({ success: true, status: 'acknowledged' });

  } catch (error: any) {
    console.error('❌ Erro no Webhook WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
