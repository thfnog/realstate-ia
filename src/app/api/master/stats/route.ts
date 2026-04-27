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

    // 5. Plan Distribution
    const { data: planDistributionRaw } = await supabaseAdmin
      .from('assinaturas')
      .select('plano_id, status, planos(nome, slug)');

    const distribution: Record<string, any> = {};
    const totalActive = (planDistributionRaw || []).filter(p => p.status === 'ativo').length;

    (planDistributionRaw || []).forEach(sub => {
      if (sub.status !== 'ativo') return;
      const name = sub.planos?.nome || 'Outros';
      if (!distribution[name]) {
        distribution[name] = { label: name, count: 0, percentage: 0 };
      }
      distribution[name].count++;
      distribution[name].percentage = Math.round((distribution[name].count / totalActive) * 100);
    });

    // 6. Recent Payments
    const { data: recentPayments } = await supabaseAdmin
      .from('faturas')
      .select(`
        valor,
        created_at,
        status,
        imobiliarias (nome),
        assinaturas (planos (nome))
      `)
      .eq('status', 'pago')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      agenciesCount: agenciesCount || 0,
      monthlyRevenue,
      annualRevenue: monthlyRevenue * 12,
      leadsCount: leadsCount || 0,
      newAgenciesCount: newAgenciesCount || 0,
      globalConversion: 18.5,
      planDistribution: Object.values(distribution),
      recentPayments: (recentPayments || []).map((p: any) => ({
        company: p.imobiliarias?.nome || 'N/A',
        plan: p.assinaturas?.planos?.nome || 'N/A',
        value: p.valor,
        date: new Date(p.created_at).toLocaleString('pt-BR'),
        status: p.status
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
