const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function syncStatus() {
  console.log('📅 Iniciando sincronização de status dos imóveis...');
  
  const workbook = XLSX.readFile('scratch/imoveis_rodrigo_martinatti_COMPLETO.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  const pubCounts: any = {};
  data.forEach((r: any) => {
    const v = String(r.Publicado);
    pubCounts[v] = (pubCounts[v] || 0) + 1;
  });
  console.log('Publicado value counts:', pubCounts);

  const unpublished = data.filter((r: any) => 
    String(r.Publicado).toLowerCase().trim() === 'não' || 
    String(r.Publicado) === '0'
  );
  const published = data.filter((r: any) => 
    String(r.Publicado).toLowerCase().trim() === 'sim' || 
    String(r.Publicado) === '1'
  );
  
  console.log(`📊 Planilha: ${published.length} publicados, ${unpublished.length} não publicados.`);

  const unpublishedRefs = unpublished.map((r: any) => r['Referência'] || r.Referencia);

  // 1. Mark non-published as 'indisponivel'
  if (unpublishedRefs.length > 0) {
    console.log(`🚫 Desativando ${unpublishedRefs.length} imóveis...`);
    const { error: err1 } = await supabase
      .from('imoveis')
      .update({ status: 'indisponivel' })
      .in('referencia', unpublishedRefs);
    
    if (err1) console.error('Erro ao desativar:', err1);
    else console.log('✅ Imóveis desativados com sucesso.');
  }

  // 2. Ensure published are 'disponivel' (unless they have other status like 'vendido')
  const publishedRefs = published.map((r: any) => r.Referencia);
  if (publishedRefs.length > 0) {
    console.log(`✅ Ativando/Mantendo ${publishedRefs.length} imóveis...`);
    const { error: err2 } = await supabase
      .from('imoveis')
      .update({ status: 'disponivel' })
      .in('referencia', publishedRefs)
      .eq('status', 'indisponivel'); // Only re-activate if they were indisponivel
    
    if (err2) console.error('Erro ao ativar:', err2);
    else console.log('✅ Status de disponibilidade atualizado.');
  }

  console.log('✨ Sincronização concluída.');
}

syncStatus();
