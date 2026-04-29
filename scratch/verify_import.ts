import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function verify() {
  const { data, error } = await supabase
    .from('imoveis')
    .select('id, titulo, tipo, proprietario_nome, valor, empreendimento, comodidades_condominio')
    .eq('imobiliaria_id', 'c29bdff8-a01f-4406-8e0a-18536bd2dc88')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample data:');
  console.log(JSON.stringify(data, null, 2));
}

verify();
