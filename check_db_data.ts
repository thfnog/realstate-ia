import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function diagnose() {
  console.log('--- PRODUCTION DATA DIAGNOSTIC ---');
  
  // 1. Check if tables have data
  const { count: brokerCount } = await supabase.from('corretores').select('*', { count: 'exact', head: true });
  const { count: propertyCount } = await supabase.from('imoveis').select('*', { count: 'exact', head: true });
  
  console.log(`Total Brokers in DB: ${brokerCount}`);
  console.log(`Total Properties in DB: ${propertyCount}`);

  // 2. List last 3 brokers to see their imobiliaria_id
  const { data: brokers } = await supabase
    .from('corretores')
    .select('id, nome, imobiliaria_id, criado_em')
    .order('criado_em', { ascending: false })
    .limit(3);
  
  console.log('\nLatest Brokers:', brokers);

  // 3. Check users
  const { data: users } = await supabase.from('usuarios').select('id, email, imobiliaria_id, role');
  console.log('\nUsers:', users);
}

diagnose();
