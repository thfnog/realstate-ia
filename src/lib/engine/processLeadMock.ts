/**
 * Mock Processing Engine — Uses in-memory data instead of Supabase
 * 
 * Same 4-step pipeline but reads from/writes to the mock database.
 */

import * as mock from '@/lib/mockDb';
import type { Lead, Corretor } from '@/lib/database.types';
import { recommendImovelsMock } from './recommendImovelsMock';
import { sendBriefing } from './sendBriefing';

export interface ProcessResult {
  success: boolean;
  corretor: Corretor | null;
  isExistingClient: boolean;
  imoveisCount: number;
  whatsappResult: string | null;
  error?: string;
}

export async function processLeadMockMode(lead: Lead): Promise<ProcessResult> {
  console.log(`\n🚀 [MOCK] Processando lead: ${lead.nome} (${lead.telefone})`);

  try {
    // Step 1: Check portfolio
    console.log('📋 Step 1: Verificando carteira...');
    const existingLead = mock.getLeadByTelefone(lead.telefone);
    const isExisting = existingLead !== undefined && existingLead.id !== lead.id;
    let corretor: Corretor | null = null;
    let corretorAnteriorNome: string | undefined;

    if (isExisting && existingLead?.corretor_id) {
      corretor = mock.getCorretorById(existingLead.corretor_id) || null;
      if (corretor) corretorAnteriorNome = corretor.nome;
      console.log(`  → Cliente existente. Corretor anterior: ${corretorAnteriorNome}`);
    }

    // Step 2: Assign broker
    if (!corretor) {
      console.log('👤 Step 2: Definindo corretor...');
      const today = new Date().toISOString().split('T')[0];
      const escalaHoje = mock.getEscalaByDate(today);

      if (escalaHoje.length > 0 && escalaHoje[0].corretores) {
        corretor = escalaHoje[0].corretores;
        console.log(`  ✅ Corretor de plantão hoje: ${corretor.nome}`);
      } else {
        // Fallback: first active broker
        const allCorretores = mock.getCorretores().filter((c) => c.ativo);
        if (allCorretores.length > 0) {
          corretor = allCorretores[allCorretores.length - 1]; // Oldest first
          console.log(`  ⚠️ Sem plantão. Atribuído: ${corretor.nome}`);
        }
      }
    }

    if (!corretor) {
      console.error('❌ Nenhum corretor disponível!');
      return { success: false, corretor: null, isExistingClient: isExisting, imoveisCount: 0, whatsappResult: null, error: 'Nenhum corretor' };
    }

    // Update lead with broker
    mock.updateLead(lead.id, { corretor_id: corretor.id });

    // Step 3: Recommend properties
    console.log('🏠 Step 3: Buscando imóveis similares...');
    const imoveis = recommendImovelsMock(lead);

    // Step 4: Send briefing
    console.log('📱 Step 4: Enviando briefing...');
    const whatsappResult = await sendBriefing({
      lead,
      corretor,
      imoveis,
      isExistingClient: isExisting,
      corretorAnteriorNome,
    });

    console.log(`✅ Lead processado com sucesso! Corretor: ${corretor.nome}\n`);

    return { success: true, corretor, isExistingClient: isExisting, imoveisCount: imoveis.length, whatsappResult };
  } catch (error) {
    console.error('❌ Erro:', error);
    return { success: false, corretor: null, isExistingClient: false, imoveisCount: 0, whatsappResult: null, error: String(error) };
  }
}
