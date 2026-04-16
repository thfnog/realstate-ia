/**
 * Step 1 — Verificar Carteira (Check Portfolio)
 * 
 * Checks if the lead's phone number already exists in the database.
 * If found, returns the assigned broker's ID.
 */

import { supabaseAdmin } from '@/lib/supabase';

export async function checkCarteira(telefone: string): Promise<{
  isExisting: boolean;
  corretorId: string | null;
  leadAnterior: { nome: string; corretor_id: string | null } | null;
}> {
  const { data: existingLeads, error } = await supabaseAdmin
    .from('leads')
    .select('id, nome, corretor_id')
    .eq('telefone', telefone)
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
