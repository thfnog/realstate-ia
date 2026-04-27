import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function finalFix() {
  const imobId = 'c29bdff8-a01f-4406-8e0a-18536bd2dc88';
  
  console.log('--- FINAL DATA FIX ---');

  // 1. Update legacy plano field to 'enterprise' (matches the subscription)
  const { error: imobError } = await supabase
    .from('imobiliarias')
    .update({ plano: 'enterprise' })
    .eq('id', imobId);

  if (imobError) console.error('Erro ao atualizar imobiliária:', imobError);
  else console.log('Imobiliária atualizada para plano enterprise.');

  // 2. Ensure the subscription is truly active
  const { error: subError } = await supabase
    .from('assinaturas')
    .update({ status: 'ativo' })
    .eq('tenant_id', imobId);

  if (subError) console.error('Erro ao garantir status da assinatura:', subError);
  else console.log('Status da assinatura garantido como ativo.');

  console.log('--- FIX CONCLUÍDO ---');
}

finalFix();
