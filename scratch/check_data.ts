import { supabaseAdmin } from '../src/lib/supabase';

async function checkLeads() {
  const { data, error, count } = await supabaseAdmin
    .from('leads')
    .select('status', { count: 'exact' });

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  console.log('Total Leads:', count);
  
  const distribution = data?.reduce((acc: any, curr: any) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {}) || {};

  console.log('Status Distribution:', distribution);

  // Check revenue
  const { data: subs } = await supabaseAdmin
    .from('assinaturas')
    .select('valor_mensal, status');
  
  console.log('Subscriptions:', subs);
}

checkLeads();
