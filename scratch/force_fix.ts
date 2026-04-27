import { supabaseAdmin } from '../src/lib/supabase';

async function run() { 
  const imobId = 'c29bdff8-a01f-4406-8e0a-18536bd2dc88';
  const userId = '60f1314e-1083-48db-bc45-04d98f657efa';
  
  console.log('Iniciando correção forçada...');

  // 1. Get Enterprise Plan ID
  const { data: plano } = await supabaseAdmin.from('planos').select('id').eq('slug', 'enterprise').single();
  if (!plano) { 
    console.error('Plano Enterprise não encontrado'); 
    return; 
  }
  console.log('Plano Enterprise ID:', plano.id);

  // 2. Upsert Subscription as ACTIVE
  const { error: subError } = await supabaseAdmin.from('assinaturas').upsert({
    tenant_id: imobId,
    plano_id: plano.id,
    status: 'ativo',
    periodo_inicio: new Date().toISOString()
  }, { onConflict: 'tenant_id' });
  
  if (subError) {
    console.error('Erro na assinatura:', subError);
  } else {
    console.log('Assinatura ativada.');
  }

  // 3. Update Imobiliaria
  const { error: imobError } = await supabaseAdmin.from('imobiliarias').update({ plano: 'pro' }).eq('id', imobId);
  if (imobError) {
    console.error('Erro na imobiliaria:', imobError);
  } else {
    console.log('Imobiliária atualizada.');
  }

  // 4. Update User Role to MASTER
  const { error: userError } = await supabaseAdmin.from('usuarios').update({ role: 'master' }).eq('id', userId);
  if (userError) {
    console.error('Erro no usuário:', userError);
  } else {
    console.log('Usuário elevado para MASTER.');
  }

  console.log('CORREÇÃO CONCLUÍDA.');
}

run();
