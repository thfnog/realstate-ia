import { processFollowUpIntelligence } from '../src/lib/engine/aiScheduler';
import { seedTestData, DEFAULT_IMOBILIARIA_ID, getCorretores } from '../src/lib/mockDb';

async function test() {
  console.log('🌱 Preparando ambiente de teste...');
  seedTestData();
  
  const corretores = getCorretores(DEFAULT_IMOBILIARIA_ID);
  const corretor = corretores[0];

  console.log(`👤 Testando para o corretor: ${corretor.nome}`);
  
  const messages = [
    "Pode ser amanhã às 14h?",
    "Queria ver aquele imóvel do Swiss Park na quinta de manhã",
    "Não tenho interesse, obrigado"
  ];

  for (const msg of messages) {
    console.log(`\n💬 Mensagem do Lead: "${msg}"`);
    const aiResponse = await processFollowUpIntelligence(msg, corretor.id, DEFAULT_IMOBILIARIA_ID);
    
    if (aiResponse) {
      console.log('🤖 Resposta da IA:\n', aiResponse);
    } else {
      console.log('ℹ️ Nenhuma resposta da IA (sem intenção de agendamento).');
    }
  }
}

test().catch(console.error);
