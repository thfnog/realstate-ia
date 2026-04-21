
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fixWebhookNow() {
  const EVOLUTION_URL = process.env.EVOLUTION_URL;
  const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
  const WEBHOOK_URL = 'https://realstate-ia.vercel.app/api/webhooks/whatsapp';

  console.log(`🚀 TENTATIVA FINAL (NESTED + UPPER_CASE) NA VPS: ${EVOLUTION_URL}`);

  try {
    const fetchRes = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    const instances = await fetchRes.json();
    if (instances.length === 0) return;

    for (const inst of instances) {
      const name = inst.instanceName || inst.name;
      console.log(`🛠️ Forçando Webhook em: ${name}`);

      const res = await fetch(`${EVOLUTION_URL}/webhook/set/${name}`, {
        method: 'POST',
        headers: { 
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: WEBHOOK_URL,
            byEvents: false,
            base64: false,
            events: [
              "MESSAGES_UPSERT",
              "SEND_MESSAGE"
            ]
          }
        })
      });

      console.log(`📡 Status da Evolution: ${res.status}`);
      const body = await res.json();
      if (res.ok) {
         console.log('✅✅ FINALMENTE REPARADO COM SUCESSO! ✅✅');
      } else {
         console.error('❌ FALHA NO REPARO:', JSON.stringify(body, null, 2));
      }
    }
  } catch (err) {
    console.error('💥 Erro:', err);
  }
}

fixWebhookNow();
