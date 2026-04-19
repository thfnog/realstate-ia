const fetch = require('node-fetch');

async function testWebhook() {
  const payload = {
    "event": "messages.upsert",
    "instance": "teste",
    "data": {
      "key": {
        "remoteJid": "5519991776473@s.whatsapp.net",
        "fromMe": false,
        "id": "SIMULATED_TEST_123"
      },
      "message": {
        "conversation": "Teste de simulação: Quero um apartamento no The Park View"
      },
      "pushName": "Letícia (Teste Simulado)"
    }
  };

  console.log('🚀 Enviando payload de teste para o webhook...');
  
  try {
    const response = await fetch('https://realstate-ia.vercel.app/api/webhooks/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('✅ Resposta do Servidor:', data);
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testWebhook();
