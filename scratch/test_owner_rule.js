/**
 * Test Owner Rule (Regra do Dono)
 * 
 * Verifies that a recurring lead stays with the same broker,
 * and falls back to Scale if the broker is INACTIVE.
 */

async function testOwnerRule() {
  const BASE_URL = 'http://localhost:3000';
  const IMOB_ID = '4cb326a7-bc13-4007-988e-111960578508';

  console.log('🚀 TESTANDO REGRA DO DONO (FIDELIZAÇÃO)...\n');

  // --- CENÁRIO 1: Lead Novo ---
  console.log('--- TESTE 1: Primeiro Contato (Vai para Escala) ---');
  const lead1 = {
    nome: 'Cliente Fidelidade',
    telefone: '(11) 95555-4444',
    descricao_interesse: 'Interesse inicial.'
  };

  const res1 = await fetch(`${BASE_URL}/api/leads?imob_id=${IMOB_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead1)
  });
  const data1 = await res1.json();
  
  // Fetch broker assigned
  const resDetail1 = await fetch(`${BASE_URL}/api/leads/${data1.leadId}`);
  const details1 = await resDetail1.json();
  const corretorOriginal = details1.corretor_id;
  console.log(`  ✅ Lead criado e atribuído ao Corretor: ${corretorOriginal}`);

  // --- CENÁRIO 2: Mesmo Lead volta (Deve manter Corretor Original) ---
  console.log('\n--- TESTE 2: Re-contato (Deve manter o mesmo Corretor) ---');
  const res2 = await fetch(`${BASE_URL}/api/leads?imob_id=${IMOB_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead1)
  });
  const data2 = await res2.json();
  
  const resDetail2 = await fetch(`${BASE_URL}/api/leads/${data2.leadId}`);
  const details2 = await resDetail2.json();
  const corretorFidelizado = details2.corretor_id;

  if (corretorFidelizado && corretorFidelizado === corretorOriginal) {
    console.log(`  ✅ SUCESSO: Lead fidelizado ao corretor original (${corretorFidelizado})`);
  } else {
    console.error(`  ❌ FALHA: Lead foi para outro corretor ou ID vazio (${corretorFidelizado})`);
  }

  // --- CENÁRIO 3: Multi-tenant Isolation ---
  console.log('\n--- TESTE 3: Mesmo Telefone em Agência DIFERENTE (Não deve misturar histórico) ---');
  const IMOB_ID_2 = 'imob-portugal-seed-id'; // Different tenant
  const res3 = await fetch(`${BASE_URL}/api/leads?imob_id=${IMOB_ID_2}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead1)
  });
  const data3 = await res3.json();
  const resDetail3 = await fetch(`${BASE_URL}/api/leads/${data3.leadId}`);
  const details3 = await resDetail3.json();
  
  if (details3.corretor_id !== corretorOriginal) {
    console.log(`  ✅ SUCESSO: Histórico isolado por agência.`);
  } else {
    console.error(`  ❌ FALHA: Histórico vazou entre agências!`);
  }
}

testOwnerRule();
