/**
 * WhatsApp Integration Provider
 */
import twilio from 'twilio';
import { supabaseAdmin } from './supabase';
import * as mock from './mockDb';
import { getConfig } from './countryConfig';

const PROVIDER = (process.env.WHATSAPP_PROVIDER?.trim() || 'evolution') as 'twilio' | 'evolution' | 'mock';

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
const EVOLUTION_URL = process.env.EVOLUTION_URL?.replace(/\/$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

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
  const instanceName = instanceOverride || process.env.WHATSAPP_DEFAULT_INSTANCE || '';
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
