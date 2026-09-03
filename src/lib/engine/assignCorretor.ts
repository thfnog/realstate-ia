/**
 * Step 2 — Definir Corretor (Assign Broker)
 * 
 * If no existing broker is assigned:
 * 1. Check the duty schedule for today
 * 2. Fallback: first active broker by creation order
 */

import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import type { Corretor } from '@/lib/database.types';

export async function assignCorretor(imobiliaria_id?: string): Promise<Corretor | null> {
  if (mock.isMockMode()) {
    const list = imobiliaria_id ? mock.getCorretoresByImobiliaria(imobiliaria_id) : mock.getCorretores();
    const active = list.filter(c => c.ativo);
    if (active.length > 0) {
      console.log(`✅ [Mock] Corretor atribuído: ${active[0].nome}`);
      return active[0];
    }
    return null;
  }

  // Use Brasilia Timezone (GMT-3) for duty schedule
  const now = new Date();
  const brTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
  const today = brTime.toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. Check duty schedule for today
  let escalaQuery = supabaseAdmin
    .from('escala')
    .select('corretor_id, corretores(*)')
    .eq('data', today);
  
  if (imobiliaria_id) {
    escalaQuery = escalaQuery.eq('imobiliaria_id', imobiliaria_id);
  }

  const { data: escalaHoje, error: escalaError } = await escalaQuery.limit(1);

  if (escalaError) {
    console.error('Erro ao consultar escala:', escalaError);
  }

  if (escalaHoje && escalaHoje.length > 0) {
    const corretor = escalaHoje[0].corretores as unknown as Corretor;
    if (corretor && corretor.ativo) {
      console.log(`✅ Corretor de plantão hoje: ${corretor.nome}`);
      return corretor;
    }
  }

  // 2. Fallback: first active broker by creation order
  let corretorQuery = supabaseAdmin
    .from('corretores')
    .select('*')
    .eq('ativo', true);
  
  if (imobiliaria_id) {
    corretorQuery = corretorQuery.eq('imobiliaria_id', imobiliaria_id);
  }

  const { data: corretores, error: corretorError } = await corretorQuery
    .order('criado_em', { ascending: true })
    .limit(1);

  if (corretorError) {
    console.error('Erro ao buscar corretor disponível:', corretorError);
    return null;
  }

  if (corretores && corretores.length > 0) {
    console.log(`⚠️ Sem plantão hoje. Atribuído ao primeiro corretor: ${corretores[0].nome}`);
    return corretores[0] as Corretor;
  }

  console.warn('❌ Nenhum corretor ativo encontrado!');
  return null;
}
