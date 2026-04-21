/**
 * WhatsApp Integration Provider
 */
import twilio from 'twilio';
import { supabaseAdmin } from './supabase';
import * as mock from './mockDb';

const PROVIDER = (process.env.WHATSAPP_PROVIDER?.trim() || 'evolution') as 'twilio' | 'evolution' | 'mock';

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
export async function sendWhatsAppMessage(to: string, body: string, instanceOverride?: string): Promise<string> {
  const instanceName = instanceOverride || process.env.WHATSAPP_DEFAULT_INSTANCE || '';
  const cleanTo = to.replace(/\D/g, '');

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
      const res = await fetch(getUrl(`/message/sendText/${instanceName}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          number: cleanTo,
          text: body,
          delay: 1200,
          linkPreview: true
        })
      });

      if (!res.ok) {
        throw new Error(`Evolution API Error: ${res.status}`);
      }

      const data = await res.json();
      return data.key?.id || 'evolution-success';
    } catch (error: any) {
      console.error(`⚠️ Falha no envio WhatsApp para ${cleanTo}. Salvando na fila de contingência...`);
      
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
