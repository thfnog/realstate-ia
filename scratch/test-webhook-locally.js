
import fetch from 'node-fetch';

async function testWebhookLive() {
  // CONFIGURAÇÃO
  const WEBHOOK_URL = 'https://realstate-ia.vercel.app/api/webhooks/whatsapp';
  const BROKER_ID = '00ae8de2-fb94-4e1f-ba46-4e27efc30f4b'; // O ID do corretor que estamos testando
  const TEST_SENDER = '5511999991234'; // Um número de teste
  const TEST_NAME = 'Leticia (Teste Automático)';
  const MESSAGE_TEXT = 'Olá, gostaria de saber o valor deste imóvel em Pinheiros';

  console.log(`🚀 ENVIANDO TESTE PARA: ${WEBHOOK_URL}`);

  const payload = {
    event: "MESSAGES_UPSERT",
    instance: `realstate-iabroker-${BROKER_ID}`,
    data: {
      key: {
        remoteJid: `${TEST_SENDER}@s.whatsapp.net`,
        fromMe: false,
        id: "TEST_MESSAGE_" + Date.now()
      },
      pushName: TEST_NAME,
      message: {
        conversation: MESSAGE_TEXT
      }
    }
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log(`📡 Status: ${response.status}`);
    const result = await response.json();
    console.log('✅ Resposta do Servidor:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n🌟 SUCESSO! O lead foi capturado pelo sistema.');
    } else {
      console.error('\n❌ O sistema respondeu mas algo deu errado.');
    }
  } catch (err) {
    console.error('💥 Erro ao conectar com o servidor:', err.message);
  }
}

testWebhookLive();
