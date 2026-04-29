
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  console.log('SUPABASE_URL:', supabaseUrl);
  console.log('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'exists' : 'missing');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkLeads() {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('id, nome, finalidade, tipo_interesse')
    .limit(20);

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  console.log('Leads found:');
  console.table(data);
}

checkLeads();
