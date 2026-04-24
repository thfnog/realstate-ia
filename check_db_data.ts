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
  try {
    console.log('--- PRODUCTION DATA DIAGNOSTIC ---');
    console.log('URL:', supabaseUrl);
    
    // 1. Check if tables have data
    const { count: brokerCount, error: err1 } = await supabase.from('corretores').select('*', { count: 'exact', head: true });
    if (err1) console.error('Error fetching brokers count:', err1);
    
    const { count: propertyCount, error: err2 } = await supabase.from('imoveis').select('*', { count: 'exact', head: true });
    if (err2) console.error('Error fetching properties count:', err2);
    
    console.log(`Total Brokers in DB: ${brokerCount}`);
    console.log(`Total Properties in DB: ${propertyCount}`);

    // 2. List last 3 brokers to see their imobiliaria_id
    const { data: brokers, error: err3 } = await supabase
      .from('corretores')
      .select('id, nome, imobiliaria_id, criado_em')
      .order('criado_em', { ascending: false })
      .limit(3);
    
    if (err3) console.error('Error fetching latest brokers:', err3);
    console.log('\nLatest Brokers:', brokers);

    // 3. Check users
    const { data: users, error: err4 } = await supabase.from('usuarios').select('id, email, imobiliaria_id, role');
    if (err4) console.error('Error fetching users:', err4);
    console.log('\nUsers:', users);
  } catch (e) {
    console.error('Fatal error in diagnostic:', e);
  }
}

diagnose();
