import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function checkApi() {
  const { data, error } = await supabase
    .from('imobiliarias')
    .select(`
      *,
      assinaturas (
        id,
        status,
        periodo_inicio,
        periodo_fim,
        planos (
          id,
          nome,
          preco_mensal
        )
      )
    `)
    .ilike('nome_fantasia', '%Martinatti%');

  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

checkApi();
