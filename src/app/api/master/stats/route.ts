import { NextResponse } from 'next/server';
import { getAuthFromCookies } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const session = await getAuthFromCookies();
  
  // Basic security check
  if (!session || (session.app_role !== 'master' && session.email !== 'admin@imobia.com')) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    // 1. Count active agencies
    const { count: agenciesCount } = await supabaseAdmin
      .from('imobiliarias')
      .select('*', { count: 'exact', head: true });

    // 2. Aggregate Revenue (Sum of active subscriptions)
    const { data: subscriptions } = await supabaseAdmin
      .from('assinaturas')
      .select(`
        status,
        planos (
          preco_mensal
        )
      `)
      .eq('status', 'ativo');

    const monthlyRevenue = (subscriptions || []).reduce((acc, sub: any) => {
      return acc + (sub.planos?.preco_mensal || 0);
    }, 0);

    // 3. Total Leads across all instances
    const { count: leadsCount } = await supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact', head: true });

    // 4. Growth (agencies created in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: newAgenciesCount } = await supabaseAdmin
      .from('imobiliarias')
      .select('*', { count: 'exact', head: true })
      .gte('criado_em', thirtyDaysAgo.toISOString());

    return NextResponse.json({
      agenciesCount: agenciesCount || 0,
      monthlyRevenue,
      annualRevenue: monthlyRevenue * 12,
      leadsCount: leadsCount || 0,
      newAgenciesCount: newAgenciesCount || 0,
      globalConversion: 18.5 // Placeholder for now until we have more complex analytics
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
