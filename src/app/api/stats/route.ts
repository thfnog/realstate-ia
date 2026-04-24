import { NextResponse } from 'next/server';
import { getUserSupabaseClient } from '@/lib/supabase';
import { getLeadRepository, getImovelRepository, getCorretorRepository } from '@/lib/repositories/factory';
import { getAuthFromCookies } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    
    const leadRepo = getLeadRepository(client);
    const imovelRepo = getImovelRepository(client);
    const corretorRepo = getCorretorRepository(client);

    // Fetch data for stats
    const [leadsData, imoveisData, corretores] = await Promise.all([
      leadRepo.findAll({ imobiliaria_id: session.imobiliaria_id, limit: 2000 }),
      imovelRepo.findAll({ imobiliaria_id: session.imobiliaria_id, limit: 2000 }),
      corretorRepo.findAll(session.imobiliaria_id)
    ]);

    let leads = leadsData.data;
    const imoveis = imoveisData.data;

    // Apply Role Filter for non-admins
    if (session.app_role === 'corretor' && session.corretor_id) {
      leads = leads.filter(l => l.corretor_id === session.corretor_id);
    }

    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);

    // Basic Counts
    const stats = {
      totalLeads: leads.length,
      leadsNovos: leads.filter(l => l.status === 'novo').length,
      leadsAtendimento: leads.filter(l => l.status === 'em_atendimento').length,
      leadsFechados: leads.filter(l => l.status === 'fechado').length,
      leadsHoje: leads.filter(l => l.criado_em.startsWith(today)).length,
      leadsSemCorretor: leads.filter(l => !l.corretor_id).length,
      totalImoveis: imoveis.length,
      imoveisDisponiveis: imoveis.filter(i => i.status === 'disponivel').length,
      totalCorretores: corretores.length,
      taxaConversao: leads.length > 0 ? (leads.filter(l => l.status === 'fechado').length / leads.length) * 100 : 0,
    };

    // Temporal Data (Last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const leadsTemporal = last7Days.map(date => ({
      date: date.split('-').slice(1, 3).reverse().join('/'),
      count: leads.filter(l => l.criado_em.startsWith(date)).length,
    }));

    // Origin Breakdown
    const countsByOrigem = leads.reduce((acc: Record<string, number>, l) => {
      const o = l.origem || 'desconhecido';
      acc[o] = (acc[o] || 0) + 1;
      return acc;
    }, {});

    // Performance by Broker (Admins only)
    let brokerPerformance: any[] = [];
    if (session.app_role === 'admin') {
      brokerPerformance = corretores.map(c => {
        const brokerLeads = leads.filter(l => l.corretor_id === c.id);
        const leadsFechados = brokerLeads.filter(l => l.status === 'fechado').length;
        const conversion = brokerLeads.length > 0 ? (leadsFechados / brokerLeads.length) * 100 : 0;
        return {
          id: c.id,
          nome: c.nome,
          leads: brokerLeads.length,
          fechados: leadsFechados,
          conversao: conversion
        };
      }).sort((a, b) => b.conversao - a.conversao);
    }

    return NextResponse.json({
      ...stats,
      leadsTemporal,
      countsByOrigem,
      brokerPerformance
    });
  } catch (err: any) {
    console.error('[API STATS ERROR]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
