import { extractLeadFromText } from '../src/lib/engine/extractLeadFromText';
import { recommendImoveis } from '../src/lib/engine/recommendImoveis';

async function testMatch() {
  const text = "Quero um apartamento de 3 a 4 quartos com mais de 2 garagens";
  console.log('Lead message:', text);
  
  const profile = extractLeadFromText(text);
  console.log('Extracted Profile:', profile);

  // Mock lead object
  const lead: any = {
    id: 'test-id',
    descricao_interesse: text,
    tipo_interesse: profile.tipo_interesse,
    quartos_interesse: profile.quartos,
    vagas_interesse: profile.vagas,
    orcamento: profile.orcamento,
    finalidade: 'comprar'
  };

  console.log('Running matching engine...');
  const results = await recommendImoveis(lead);
  
  console.log(`Found ${results.length} matches:`);
  results.forEach(r => {
    console.log(`- ${r.titulo} (Score: ${r.score})`);
    console.log(`  Breakdown: ${r.scoreBreakdown.join(', ')}`);
  });
}

testMatch();
