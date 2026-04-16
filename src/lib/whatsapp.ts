/**
 * WhatsApp Integration via Twilio
 * 
 * Sends WhatsApp messages using the Twilio API.
 * Falls back to console logging when credentials are not configured.
 */

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

// Check if Twilio is configured
const isTwilioConfigured = !!(accountSid && authToken && accountSid.length > 5);

// Create Twilio client only if credentials are available
const client = isTwilioConfigured ? twilio(accountSid, authToken) : null;

/**
 * Send a WhatsApp message via Twilio.
 * If Twilio is not configured, logs the message to console as fallback.
 * 
 * @param to - Phone number in format "whatsapp:+55XXXXXXXXXXX"
 * @param body - Message body text
 * @returns Message SID if sent, or "console-fallback" if logged only
 */
export async function sendWhatsAppMessage(to: string, body: string): Promise<string> {
  // Ensure the 'to' number has the WhatsApp prefix
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  if (!client) {
    console.log('\n========================================');
    console.log('📱 WHATSAPP BRIEFING (console fallback)');
    console.log('========================================');
    console.log(`Para: ${toFormatted}`);
    console.log('----------------------------------------');
    console.log(body);
    console.log('========================================\n');
    return 'console-fallback';
  }

  try {
    const message = await client.messages.create({
      from: fromNumber,
      to: toFormatted,
      body,
    });

    console.log(`✅ WhatsApp enviado com sucesso. SID: ${message.sid}`);
    return message.sid;
  } catch (error) {
    console.error('❌ Erro ao enviar WhatsApp:', error);
    // Log the message anyway so it's not lost
    console.log('\n📱 MENSAGEM QUE SERIA ENVIADA:');
    console.log(`Para: ${toFormatted}`);
    console.log(body);
    throw error;
  }
}
