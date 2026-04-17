/**
 * Mock Processing Engine — Uses in-memory data instead of Supabase
 * 
 * Same 4-step pipeline but reads from/writes to the mock database.
 */

import * as mock from '@/lib/mockDb';
import type { Lead, Corretor } from '@/lib/database.types';
import { recommendImovelsMock } from './recommendImovelsMock';
import { sendBriefing } from './sendBriefing';
import { getConfigByCode } from '@/lib/countryConfig';

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
    // Step 0: Regionalization
    const imob = mock.getImobiliariaById(lead.imobiliaria_id);
    const config = getConfigByCode(imob?.config_pais || 'PT');

    // Step 1: Check portfolio
    console.log(`📋 Step 1: Verificando carteira (${config.flag} ${config.label})...`);
    const existingLead = mock.getLeadByTelefone(lead.telefone, lead.imobiliaria_id);
    const isExisting = existingLead !== undefined && existingLead.id !== lead.id;
    let corretor: Corretor | null = null;
    let corretorAnteriorNome: string | undefined;

    if (isExisting && existingLead?.corretor_id) {
      const bFound = mock.getCorretorById(existingLead.corretor_id);
      // REGRA DO DONO: Só mantém se o corretor ainda estiver ativo na imobiliária
      if (bFound && bFound.ativo) {
        corretor = bFound;
        corretorAnteriorNome = corretor.nome;
        console.log(`  → Cliente existente. Corretor mantido da carteira: ${corretorAnteriorNome}`);
      } else {
        console.log(`  → Cliente existente, mas corretor anterior (${existingLead.corretor_id}) está inativo ou não existe. Seguindo para escala.`);
      }
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
        // Fallback: first active broker of THIS imobiliaria
        const allCorretores = mock.getCorretores(lead.imobiliaria_id).filter((c) => c.ativo);
        if (allCorretores.length > 0) {
          corretor = allCorretores[0]; // First active
          console.log(`  ⚠️ Sem plantão. Atribuído por fila local: ${corretor.nome}`);
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
    console.log('📱 Step 4: Enviando briefing regionalizado...');
    const whatsappResult = await sendBriefing({
      lead,
      corretor,
      imoveis,
      isExistingClient: isExisting,
      corretorAnteriorNome,
      config,
    });

    console.log(`✅ Lead processado com sucesso! Corretor: ${corretor.nome}\n`);

    return { success: true, corretor, isExistingClient: isExisting, imoveisCount: imoveis.length, whatsappResult };
  } catch (error) {
    console.error('❌ Erro:', error);
    return { success: false, corretor: null, isExistingClient: false, imoveisCount: 0, whatsappResult: null, error: String(error) };
  }
}
