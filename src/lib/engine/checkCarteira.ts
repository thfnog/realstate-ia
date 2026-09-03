/**
 * Step 1 — Verificar Carteira (Check Portfolio)
 * 
 * Checks if the lead's phone number already exists in the database.
 * If found, returns the assigned broker's ID.
 */

import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';

export async function checkCarteira(telefone: string, imobiliariaId: string): Promise<{
  isExisting: boolean;
  corretorId: string | null;
  leadAnterior: { nome: string; corretor_id: string | null } | null;
}> {
  if (mock.isMockMode()) {
    const existing = mock.leads.find(l => l.telefone === telefone && l.imobiliaria_id === imobiliariaId);
    if (existing) {
      return {
        isExisting: true,
        corretorId: existing.corretor_id,
        leadAnterior: { nome: existing.nome, corretor_id: existing.corretor_id }
      };
    }
    return { isExisting: false, corretorId: null, leadAnterior: null };
  }

  const { data: existingLeads, error } = await supabaseAdmin
    .from('leads')
    .select('id, nome, corretor_id')
    .eq('telefone', telefone)
    .eq('imobiliaria_id', imobiliariaId)
    .order('criado_em', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Erro ao verificar carteira:', error);
    return { isExisting: false, corretorId: null, leadAnterior: null };
  }

  if (existingLeads && existingLeads.length > 0) {
    const lead = existingLeads[0];
    return {
      isExisting: true,
      corretorId: lead.corretor_id,
      leadAnterior: { nome: lead.nome, corretor_id: lead.corretor_id },
    };
  }

  return { isExisting: false, corretorId: null, leadAnterior: null };
}
