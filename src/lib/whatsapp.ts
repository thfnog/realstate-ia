/**
 * WhatsApp Integration Provider
 * 
 * Suporta múltiplos provedores:
 * 1. Twilio (Oficial / Pago)
 * 2. Evolution API (Open Source / Grátis por mensagem)
 */

import twilio from 'twilio';

const PROVIDER = (process.env.WHATSAPP_PROVIDER || 'evolution') as 'twilio' | 'evolution' | 'mock';

// Evolution Config
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'MainInstance';

// Twilio Config
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

/**
 * Envia uma mensagem de WhatsApp usando o provedor configurado.
 */
export async function sendWhatsAppMessage(to: string, body: string): Promise<string> {
  // Limpeza básica do número (apenas dígitos)
  const cleanTo = to.replace(/\D/g, '');

  if (PROVIDER === 'mock' || (!EVOLUTION_API_KEY && !accountSid)) {
    console.log('\n📱 [MOCK WHATSAPP] To:', to, '\nBody:', body);
    return 'mock-sid';
  }

  // --- REGRAS EVOLUTION API ---
  if (PROVIDER === 'evolution' && EVOLUTION_API_KEY) {
    try {
      const response = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: cleanTo,
          options: {
            delay: 1200,
            presence: 'composing',
            linkPreview: true
          },
          textMessage: {
            text: body
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Evolution API Error: ${response.status} - ${errorText}`);
      }

      console.log(`✅ WhatsApp enviado via Evolution API para ${cleanTo}`);
      return 'evolution-success';
    } catch (error) {
      console.error('❌ Erro Evolution API:', error);
      throw error;
    }
  }

  // --- REGRAS TWILIO ---
  if (PROVIDER === 'twilio' && accountSid && authToken) {
    const client = twilio(accountSid, authToken);
    const toFormatted = `whatsapp:+${cleanTo}`;
    
    try {
      const message = await client.messages.create({
        from: fromNumber,
        to: toFormatted,
        body,
      });
      console.log(`✅ WhatsApp enviado via Twilio. SID: ${message.sid}`);
      return message.sid;
    } catch (error) {
      console.error('❌ Erro Twilio:', error);
      throw error;
    }
  }

  return 'no-provider-configured';
}
