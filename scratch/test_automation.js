/**
 * Test Lead Ingestion Automation
 * 
 * Simulates:
 * 1. Canal Pro Webhook (BR)
 * 2. Idealista Email Notification (PT)
 */

async function testIngest() {
  const BASE_URL = 'http://localhost:3000';
  const IMOB_ID_DEMO = '4cb326a7-bc13-4007-988e-111960578508'; // Default mock ID

  console.log('--- TESTE 1: Webhook Canal Pro (BR) ---');
  const payloadWebhook = {
    leadOrigin: 'VivaReal',
    name: 'Thiago Webhook',
    email: 'thiago.webhook@exemplo.com.br',
    ddd: '11',
    phone: '998887766',
    message: 'Tenho muito interesse neste apartamento em Pinheiros.',
    transactionType: 'SELL',
    extraData: { leadType: 'CONTACT_FORM' }
  };

  const res1 = await fetch(`${BASE_URL}/api/ingest/grupozap?imob_id=${IMOB_ID_DEMO}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadWebhook)
  });
  console.log('Status Webhook:', res1.status);
  console.log('Resposta:', await res1.json());


  console.log('\n--- TESTE 2: Email Idealista (PT) ---');
  const emailBody = `
    Novo pedido de contacto em Idealista
    Nome: António Mendes
    Telefone: 912345678
    E-mail: antonio.mendes@servidor.pt
    Mensagem: Gostaria de agendar uma visita amanhã no T2 do Chiado.
    Referência: REF-1234-X
  `;

  const res2 = await fetch(`${BASE_URL}/api/ingest/email?imob_id=${IMOB_ID_DEMO}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: emailBody })
  });
  console.log('Status Email:', res2.status);
  console.log('Resposta:', await res2.json());
}

testIngest();
