
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testFilter() {
  console.log('Testing filter finalidade=comprar...');
  
  let query = supabaseAdmin
    .from('leads')
    .select('id, nome, finalidade', { count: 'exact' })
    .eq('finalidade', 'comprar');

  const { data, count, error } = await query;
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Count:', count);
  console.log('Data:', data);
}

testFilter();
