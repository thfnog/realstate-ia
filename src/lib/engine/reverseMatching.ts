/**
 * Reverse Matching Engine
 * 
 * finds leads that might be interested in a newly registered property.
 */
import { supabaseAdmin } from '@/lib/supabase';
import { isMockMode, getLeads, getCorretorById, DEFAULT_IMOBILIARIA_ID } from '@/lib/mockDb';
import type { Imovel, Lead } from '@/lib/database.types';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function matchLeadsForProperty(property: Imovel) {
  console.log(`🔍 Iniciando Match Reverso para o imóvel: ${property.referencia} em ${property.freguesia}`);

  try {
    // 1. Buscamos leads ativos (novo ou em_atendimento) da mesma imobiliária
    let leads: Lead[] = [];
    if (isMockMode()) {
      leads = getLeads().filter(l => 
        (l.imobiliaria_id === property.imobiliaria_id || property.imobiliaria_id === DEFAULT_IMOBILIARIA_ID || !property.imobiliaria_id) &&
        ['novo', 'em_atendimento', 'visita_agendada'].includes(l.status)
      );
    } else {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('imobiliaria_id', property.imobiliaria_id)
        .in('status', ['novo', 'em_atendimento']);

      if (error) throw error;
      leads = data || [];
    }

    if (!leads || leads.length === 0) return [];

    const matches: Lead[] = [];

    for (const lead of leads) {
      let score = 0;

      // Critério 1: Tipo de Imóvel
      if (lead.tipo_interesse === property.tipo) score += 5;

      // Critério 2: Preço (Lead orcamento >= property valor)
      if (lead.orcamento && property.valor) {
        const diff = Math.abs(lead.orcamento - property.valor) / lead.orcamento;
        if (diff <= 0.20) score += 4; // Até 20% de variação
      }

      // Critério 3: Localização (Bairro match)
      if (lead.bairros_interesse && lead.bairros_interesse.length > 0) {
        const bairroNorm = (property.freguesia || '').toLowerCase().trim();
        const hasBairro = lead.bairros_interesse.some((b: string) => b.toLowerCase().trim() === bairroNorm || bairroNorm.includes(b.toLowerCase().trim()));
        if (hasBairro) score += 3;
      }

      // Se o score for alto o suficiente, notificamos o corretor ou marcamos o match
      if (score >= 7) {
        matches.push(lead);
        console.log(`✨ Match encontrado! Lead ${lead.nome} tem interesse no novo imóvel ${property.referencia}`);
        
        // Opcional: Notificar o corretor atrelado ao lead sobre o novo imóvel
        if (lead.corretor_id) {
          let corretor: any = null;
          if (isMockMode()) {
            corretor = getCorretorById(lead.corretor_id);
          } else {
            const { data } = await supabaseAdmin
              .from('corretores')
              .select('nome, whatsapp_instance')
              .eq('id', lead.corretor_id)
              .single();
            corretor = data;
          }
          
          if (corretor && corretor.whatsapp_instance) {
            const message = `🚀 *Novo Imóvel Compatível!*\n\nAcabamos de cadastrar o imóvel *${property.referencia}* (${property.titulo}) e ele é um excelente match para o seu lead *${lead.nome}*.\n\nPreço: ${property.valor}\nLocal: ${property.freguesia}\n\nQue tal enviar para ele agora?`;
            await sendWhatsAppMessage(corretor.whatsapp_instance, message, corretor.whatsapp_instance);
          }
        }
      }
    }

    return matches;
  } catch (error) {
    console.error('❌ Erro no Match Reverso:', error);
    return [];
  }
}
