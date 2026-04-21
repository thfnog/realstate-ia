
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debugAllWebhooks() {
  const EVOLUTION_URL = process.env.EVOLUTION_URL;
  const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

  try {
    const fetchRes = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    const instances = await fetchRes.json();
    console.log('FULL INSTANCE DATA:', JSON.stringify(instances, null, 2));
  } catch (err) {
    console.error('💥 Erro fatal:', err);
  }
}

debugAllWebhooks();
