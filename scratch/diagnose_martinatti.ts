import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
  console.log('--- DIAGNÓSTICO ---');
  
  // 1. Encontrar Martinatti
  const { data: imobs, error: imobError } = await supabase
    .from('imobiliarias')
    .select('*')
    .ilike('nome_fantasia', '%Martinatti%');

  if (imobError) {
    console.error('Erro ao buscar imobiliária:', imobError);
    return;
  }

  if (imobs.length === 0) {
    console.log('Imobiliária Martinatti não encontrada.');
    return;
  }

  const martinatti = imobs[0];
  console.log('Imobiliária encontrada:', {
    id: martinatti.id,
    nome: martinatti.nome_fantasia,
    plano: martinatti.plano,
    status: martinatti.status 
  });

  // 2. Verificar Assinaturas
  const { data: subs, error: subError } = await supabase
    .from('assinaturas')
    .select('*, planos(*)')
    .eq('tenant_id', martinatti.id);

  if (subError) {
    console.error('Erro ao buscar assinaturas:', subError);
  } else {
    console.log('Assinaturas encontradas:', subs.length);
    subs.forEach(s => {
      console.log(`- ID: ${s.id}, Status: ${s.status}, Plano: ${s.planos?.nome}, Módulos: ${JSON.stringify(s.planos?.modulos)}`);
    });
  }

  // 3. Verificar Planos disponíveis
  const { data: planos } = await supabase.from('planos').select('*');
  console.log('Planos na tabela:', planos?.map(p => ({ slug: p.slug, nome: p.nome, modulos: p.modulos })));

  // 4. Verificar Usuário
  const { data: users } = await supabase.from('usuarios').select('*').eq('email', 'thfnog@gmail.com');
  console.log('Usuário thfnog@gmail.com:', users?.map(u => ({ id: u.id, role: u.role, imob_id: u.imobiliaria_id })));

  console.log('--- FIM DO DIAGNÓSTICO ---');
}

diagnose();
