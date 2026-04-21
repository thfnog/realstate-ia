import { supabaseAdmin } from './src/lib/supabase';

async function checkQueue() {
  const { data, error } = await supabaseAdmin
    .from('mensagens_pendentes')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching queue:', error);
    return;
  }

  console.log('Last 5 pending messages:');
  data?.forEach(msg => {
    console.log(`- ID: ${msg.id}`);
    console.log(`  Para: ${msg.telefone}`);
    console.log(`  Erro: ${msg.ultimo_erro}`);
    console.log(`  Data: ${msg.criado_em}`);
    console.log('---');
  });
}

checkQueue();
