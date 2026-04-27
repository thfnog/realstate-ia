import { NextResponse } from 'next/server';
import { getAuthFromCookies } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const session = await getAuthFromCookies();
  
  if (!session || (session.app_role !== 'master' && session.email !== 'admin@imobia.com')) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const results: any = {
    vercel: { name: 'Vercel Edge / Functions', status: 'operational', message: 'Sistemas normais' },
    supabase: { name: 'Supabase (DB & Auth)', status: 'pending' },
    evolution: { name: 'Evolution API (AWS)', status: 'pending' },
    openai: { name: 'OpenAI (LLM)', status: 'pending' },
  };

  // 1. Check Supabase
  try {
    const { data, error } = await supabaseAdmin.from('imobiliarias').select('id').limit(1);
    if (error) throw error;
    results.supabase.status = 'operational';
    results.supabase.message = 'Conexão estável';
  } catch (err: any) {
    results.supabase.status = 'degraded';
    results.supabase.message = err.message;
  }

  // 2. Check Evolution API
  const evolutionUrl = process.env.EVOLUTION_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  
  if (evolutionUrl && evolutionKey) {
    try {
      const start = Date.now();
      const res = await fetch(`${evolutionUrl.replace(/\/$/, '')}/instance/fetchInstances`, {
        headers: { 'apikey': evolutionKey },
        next: { revalidate: 0 }
      });
      const end = Date.now();
      
      if (res.ok) {
        results.evolution.status = 'operational';
        results.evolution.message = `Online (${end - start}ms)`;
      } else {
        results.evolution.status = 'degraded';
        results.evolution.message = `Erro HTTP ${res.status}`;
      }
    } catch (err: any) {
      results.evolution.status = 'down';
      results.evolution.message = 'Inalcançável (Timeout/DNS)';
    }
  } else {
    results.evolution.status = 'not_configured';
    results.evolution.message = 'Variáveis de ambiente ausentes';
  }

  // 3. Check OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${openaiKey}` },
        next: { revalidate: 0 }
      });
      if (res.ok) {
        results.openai.status = 'operational';
        results.openai.message = 'API Respondendo';
      } else {
        results.openai.status = 'degraded';
        results.openai.message = 'Chave inválida ou quota excedida';
      }
    } catch {
      results.openai.status = 'down';
      results.openai.message = 'Falha na conexão com OpenAI';
    }
  } else {
    results.openai.status = 'not_configured';
    results.openai.message = 'Chave não configurada';
  }

  return NextResponse.json(results);
}
