/**
 * WhatsApp Integration Provider
 */
import twilio from 'twilio';
import { supabaseAdmin } from './supabase';
import * as mock from './mockDb';
import { getConfig } from './countryConfig';

const PROVIDER = (process.env.WHATSAPP_PROVIDER?.trim().replace(/\r?\n/g, '') || 'evolution') as 'twilio' | 'evolution' | 'mock';

/**
 * Sanitizes phone number to ensure it has the country prefix (DDI)
 */
function sanitizePhone(to: string, countryCode?: string): string {
  const clean = to.replace(/\D/g, '');
  
  // Heuristic detection based on length if no code provided
  let prefix = countryCode === 'BR' ? '55' : '351';
  
  if (!countryCode) {
    if (clean.length === 11) prefix = '55'; // BR (DDD + 9 digits)
    if (clean.length === 9) prefix = '351'; // PT
  }

  // If number doesn't start with prefix, prepend it
  if (!clean.startsWith(prefix)) {
    // Special case: if it starts with 55 but has 13 digits, it's already prefixed
    // If it starts with 351 but has 12 digits, it's already prefixed
    return `${prefix}${clean}`;
  }
  
  return clean;
}

// Evolution Config
const EVOLUTION_URL = process.env.EVOLUTION_URL?.trim().replace(/[\r\n]/g, '').replace(/\/$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY?.trim().replace(/[\r\n]/g, '');

// Twilio Config
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

function getUrl(path: string) {
  return `${EVOLUTION_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Check if the instance is currently connected in Evolution API
 */
export async function fetchInstanceStatus(instanceName: string): Promise<'open' | 'close' | 'connecting'> {
  if (PROVIDER === 'twilio') return 'open';
  if (!EVOLUTION_URL || !EVOLUTION_API_KEY) return 'close';

  try {
    const res = await fetch(getUrl(`/instance/connectionState/${instanceName}`), {
      headers: {
        'apikey': EVOLUTION_API_KEY || ''
      }
    });
    
    if (!res.ok) return 'close';
    const data = await res.json();
    const state = data.instance?.state || data.state;

    if (state === 'open' || state === 'CONNECTED') return 'open';
    if (state === 'connecting' || state === 'CONNECTING') return 'connecting';
    return 'close';
  } catch (error) {
    console.error(`❌ Erro ao consultar status da instância ${instanceName}:`, error);
    return 'close';
  }
}

/**
 * Envia uma mensagem de WhatsApp usando o provedor configurado com contingência.
 */
export async function sendWhatsAppMessage(to: string, body: string, instanceOverride?: string, countryCode?: string): Promise<string> {
  const instanceName = (instanceOverride || process.env.WHATSAPP_DEFAULT_INSTANCE || '').trim().replace(/[\r\n]/g, '');
  const cleanTo = sanitizePhone(to, countryCode);

  if (PROVIDER === 'mock') {
    console.log(`[MOCK] WhatsApp para ${cleanTo}: ${body.slice(0, 30)}...`);
    return 'mock-sid';
  }

  // --- TWILIO ---
  if (PROVIDER === 'twilio' && twilioClient) {
    try {
      const message = await twilioClient.messages.create({
        body,
        from: fromNumber,
        to: `whatsapp:+${cleanTo}`,
      });
      return message.sid;
    } catch (error: any) {
      console.error('❌ Erro no Twilio:', error);
      throw error;
    }
  }

  // --- EVOLUTION API ---
  if (PROVIDER === 'evolution' && EVOLUTION_URL && EVOLUTION_API_KEY) {
    try {
      console.log(`[Evolution] Enviando mensagem via instância: ${instanceName} para ${cleanTo}`);
      
      const res = await fetch(getUrl(`/message/sendText/${instanceName}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          number: cleanTo.includes('@') ? cleanTo : `${cleanTo}@s.whatsapp.net`,
          text: body, // Legacy v1
          textMessage: { text: body }, // Evolution v2
          options: {
            delay: 1200,
            presence: "composing",
            linkPreview: true
          }
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[Evolution] Erro da API (${res.status}): ${errText}`);
        
        // Fallback: If instance-specific failed and it's not the default, try default
        const defaultInstance = process.env.WHATSAPP_DEFAULT_INSTANCE;
        if (instanceName !== defaultInstance && defaultInstance) {
           console.log(`[Evolution] Tentando fallback para instância padrão: ${defaultInstance}`);
           return sendWhatsAppMessage(cleanTo, body, defaultInstance, countryCode);
        }

        throw new Error(`Evolution API Error: ${res.status} - ${errText}`);
      }

      const data = await res.json();
      console.log(`[Evolution] Sucesso ao enviar para ${cleanTo}. ID: ${data.key?.id || '?'}`);
      return data.key?.id || 'evolution-success';
    } catch (error: any) {
      console.error(`⚠️ Falha no envio WhatsApp para ${cleanTo}: ${error.message}`);
      
      // Save to pending queue
      if (!mock.isMockMode() && instanceName) {
        try {
          const { data: broker } = await supabaseAdmin
            .from('corretores')
            .select('imobiliaria_id, id')
            .eq('whatsapp_instance', instanceName)
            .single();

          if (broker) {
            await supabaseAdmin.from('mensagens_pendentes').insert([{
              imobiliaria_id: broker.imobiliaria_id,
              corretor_id: broker.id,
              telefone_destino: cleanTo,
              mensagem: body,
              instance_name: instanceName,
              status: 'pendente',
              erro_log: error.message
            }]);
            console.log(`📥 Mensagem enfileirada para ${cleanTo} (Instância: ${instanceName})`);
          }
        } catch (dbError) {
          console.error('❌ Falha ao salvar na fila:', dbError);
        }
      }
      return 'queued';
    }
  }

  return 'no-provider-configured';
}

/**
 * Busca os detalhes da instância para obter o número do dono (ownerJid)
 */
export async function fetchInstanceOwner(instanceName: string): Promise<string | null> {
  if (PROVIDER !== 'evolution' || !EVOLUTION_API_KEY) return null;

  try {
    const response = await fetch(getUrl('/instance/fetchInstances'), {
      headers: { 'apikey': EVOLUTION_API_KEY! }
    });

    if (!response.ok) return null;

    const instances = await response.json();
    const instance = instances.find((i: any) => i.instanceName === instanceName);

    if (!instance || !instance.owner) return null;
    return instance.owner;
  } catch (error) {
    console.error('❌ Erro ao buscar dono da instância:', error);
    return null;
  }
}

/**
 * Persiste uma mensagem no histórico do banco de dados
 */
export async function saveMessageToHistory({
  imobiliaria_id,
  lead_id,
  corretor_id,
  direction,
  message_text,
  status = 'sent',
  provider_id,
  is_bot = false
}: {
  imobiliaria_id: string;
  lead_id: string;
  corretor_id?: string | null;
  direction: 'inbound' | 'outbound';
  message_text: string;
  status?: 'sent' | 'delivered' | 'read' | 'error';
  provider_id?: string | null;
  is_bot?: boolean;
}) {
  if (mock.isMockMode()) return;

  try {
    const { error } = await supabaseAdmin.from('mensagens_historico').insert([{
      imobiliaria_id,
      lead_id,
      corretor_id: corretor_id || null,
      direction,
      message_text,
      status,
      provider_id: provider_id || null,
      is_bot
    }]);

    if (error) {
      console.error('❌ Erro ao salvar histórico de mensagem:', error);
    }
  } catch (err) {
    console.error('❌ Falha catastrófica ao salvar histórico:', err);
  }
}
/**
 * Verifica se já existe uma interação prévia no histórico do WhatsApp.
 * Critérios:
 * 1. Existe alguma mensagem enviada pelo corretor (fromMe: true)?
 * 2. Existe alguma mensagem (de qualquer lado) com mais de 10 minutos de idade?
 */
export async function hasPriorInteraction(instanceName: string, remoteJid: string): Promise<boolean> {
  if (PROVIDER !== 'evolution' || !EVOLUTION_API_KEY || !EVOLUTION_URL) return false;

  const jid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
  const phone = jid.split('@')[0];
  console.log(`🕵️ Analisando histórico profundo para JID: ${jid}`);

  try {
    // Tentamos buscar as mensagens. Se findMessages falhar, tentamos fetchMessages.
    let messages: any[] = [];
    
    const res = await fetch(getUrl(`/chat/findMessages/${instanceName}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
      body: JSON.stringify({ where: { key: { remoteJid: jid } }, limit: 50 })
    });

    if (res.ok) {
      const data = await res.json();
      messages = Array.isArray(data) ? data : (data.messages || []);
    } else {
      // Fallback para fetchMessages
      const resFallback = await fetch(getUrl(`/chat/fetchMessages/${instanceName}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
        body: JSON.stringify({ number: phone, count: 50 })
      });
      if (resFallback.ok) {
        const dataFallback = await resFallback.json();
        messages = Array.isArray(dataFallback) ? dataFallback : (dataFallback.messages || []);
      }
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      console.log(`🕵️ [${phone}] Nenhum histórico encontrado na Evolution.`);
      return false;
    }

    const now = Date.now();
    const tenMinutesAgo = now - (10 * 60 * 1000);

    let hasHumanMe = false;
    let hasOldMessages = false;

    for (const m of messages) {
      // 1. Verificação fromMe (Corretor respondeu?)
      if (m.key?.fromMe === true) {
        // Verificar se não é o próprio bot (opcional, mas seguro)
        const text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
        const isBot = text.toLowerCase().includes('recebi seu interesse') || text.toLowerCase().includes('recebi o seu contacto');
        if (!isBot) hasHumanMe = true;
      }

      // 2. Verificação de Idade (Mensagens antigas no chat?)
      const msgTimestamp = (m.messageTimestamp || m.timestamp || 0) * 1000;
      if (msgTimestamp > 0 && msgTimestamp < tenMinutesAgo) {
        hasOldMessages = true;
      }
      
      if (hasHumanMe || hasOldMessages) break;
    }

    const verdict = hasHumanMe || hasOldMessages;
    console.log(`🕵️ [${phone}] Veredito: ${verdict ? 'CONVERSA ANTIGA' : 'CONVERSA NOVA'} (Broker: ${hasHumanMe}, Antiga: ${hasOldMessages})`);
    return verdict;

  } catch (err) {
    console.error(`❌ Falha na análise de histórico para ${phone}:`, err);
    return false;
  }
}
