/**
 * Test WhatsApp Lead Ingestion
 * 
 * Simulates:
 * 1. Evolution API (MESSAGES_UPSERT)
 * 2. Z-API (RECEIVED_MESSAGE)
 */

async function testWhatsApp() {
  const BASE_URL = 'http://localhost:3000';
  const IMOB_ID_DEMO = '4cb326a7-bc13-4007-988e-111960578508';

  console.log('--- TESTE 1: Evolution API (Mensagem de Texto) ---');
  const evolutionPayload = {
    event: 'messages.upsert',
    instance: 'ImobIA_Instance',
    data: {
      key: {
        remoteJid: '5511998887766@s.whatsapp.net',
        fromMe: false,
        id: 'ABC123XYZ'
      },
      pushName: 'Carlos Silveira',
      message: {
        conversation: 'Olá, gostaria de saber mais sobre o T3 no Porto.'
      }
    }
  };

  const res1 = await fetch(`${BASE_URL}/api/ingest/whatsapp?imob_id=${IMOB_ID_DEMO}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evolutionPayload)
  });
  console.log('Status Evolution:', res1.status);
  console.log('Resposta:', await res1.json());


  console.log('\n--- TESTE 2: Z-API (Mensagem de Áudio) ---');
  const zapiPayload = {
    instance: 'Zapi_Instance',
    callbackType: 'received_message',
    data: {
      sender: '5511977776655',
      chatName: 'Juliana Portela',
      message: {
        id: 'ZAPI_AUD_123',
        type: 'audio',
        fromMe: false
      }
    }
  };

  const res2 = await fetch(`${BASE_URL}/api/ingest/whatsapp?imob_id=${IMOB_ID_DEMO}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(zapiPayload)
  });
  console.log('Status Z-API:', res2.status);
  console.log('Resposta:', await res2.json());
}

testWhatsApp();
