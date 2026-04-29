import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function checkColumns() {
  const { data, error } = await supabase
    .from('imoveis')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching imoveis:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns in imoveis:', Object.keys(data[0]));
  } else {
    console.log('No data to check columns.');
    // Try to insert a dummy row with a new column
    const { error: insError } = await supabase
      .from('imoveis')
      .insert([{ titulo: 'Test', pais: 'BR', column_that_does_not_exist: 'Test' }]);
      
    if (insError) {
      console.log('Error inserting with new column:', insError.message);
    } else {
      console.log('Column proprietario_nome exists!');
      // Clean up
      await supabase.from('imoveis').delete().eq('titulo', 'Test');
    }
  }
}

checkColumns();
