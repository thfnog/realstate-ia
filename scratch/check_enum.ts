import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_column_type', { table_name: 'imoveis', column_name: 'tipo' });
  // Since get_column_type might not exist, I'll use a raw query if I could, but I can't.
  // I'll try to find information via introspection queries if possible, but RPC is limited.
  
  // Let's try to just insert a valid but different value to see if it's restricted.
  const { error: insError } = await supabase
    .from('imoveis')
    .insert([{ titulo: 'Test Enum', pais: 'BR', tipo: 'apartamento' }]);
  
  if (insError) {
    console.log('Error inserting valid enum:', insError.message);
  } else {
    console.log('apartamento is a valid value.');
    await supabase.from('imoveis').delete().eq('titulo', 'Test Enum');
  }

  const { error: insError5 } = await supabase
    .from('imoveis')
    .insert([{ titulo: 'Test Enum 5', pais: 'BR', status: 'non_existent_status' }]);
  console.log('Status check:', insError5?.message || 'Valid');
}

checkSchema();
