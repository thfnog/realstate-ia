import { supabaseAdmin } from './src/lib/supabase';

async function check() {
  const { count: total } = await supabaseAdmin.from('mensagens_historico').select('*', { count: 'exact', head: true });
  const { count: bot } = await supabaseAdmin.from('mensagens_historico').select('*', { count: 'exact', head: true }).eq('is_bot', true);
  const { data: samples } = await supabaseAdmin.from('mensagens_historico').select('*').limit(5);

  console.log('Total Messages:', total);
  console.log('Bot Messages:', bot);
  console.log('Samples:', JSON.stringify(samples, null, 2));
}

check();
