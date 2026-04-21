import { supabaseAdmin } from './src/lib/supabase';

async function check() {
  const { data, error } = await supabaseAdmin.from('corretores').select('*').limit(1);
  if (error) {
    console.error('Error fetching corretores:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in corretores:', Object.keys(data[0]));
  } else {
     console.log('No data in corretores table.');
  }
}
check();
