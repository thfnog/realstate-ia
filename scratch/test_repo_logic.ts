
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testRepository() {
  const imob_id = 'c29bdff8-a01f-4406-8e0a-18536bd2dc88';
  console.log(`Testing repository for imob_id: ${imob_id} with finalidade: comprar`);
  
  let query = supabaseAdmin
    .from('leads')
    .select('*, corretores(*), imoveis(*)', { count: 'exact' });

  // Simulate SupabaseLeadRepository logic
  query = query.neq('status', 'descartado');
  query = query.eq('finalidade', 'comprar');
  query = query.eq('imobiliaria_id', imob_id);
  query = query.order('criado_em', { ascending: false });

  const { data, count, error } = await query;
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Count:', count);
  console.log('Results:', data?.map(d => ({ id: d.id, nome: d.nome, finalidade: d.finalidade })));
}

testRepository();
