/**
 * Motor de Processamento — Orchestrator
 * 
 * Executes the full lead processing pipeline:
 *   Step 1: Check portfolio (existing client?)
 *   Step 2: Assign broker (from schedule or fallback)
 *   Step 3: Recommend matching properties
 *   Step 4: Send WhatsApp briefing to broker
 */

import { supabaseAdmin } from '@/lib/supabase';
import type { Lead, Corretor } from '@/lib/database.types';
import { checkCarteira } from './checkCarteira';
import { assignCorretor } from './assignCorretor';
import { recommendImoveis } from './recommendImoveis';
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

export async function processLead(lead: Lead): Promise<ProcessResult> {
  console.log(`\n🚀 Processando lead: ${lead.nome} (${lead.telefone})`);

  try {
    // Step 0: Fetch Tenant Config (Regionalization)
    const { data: imob } = await supabaseAdmin
      .from('imobiliarias')
      .select('config_pais')
      .eq('id', lead.imobiliaria_id)
      .single();
    
    const config = getConfigByCode(imob?.config_pais || 'PT');

    // Step 1: Check portfolio
    console.log(`📋 Step 1: Verificando carteira (${config.flag} ${config.label})...`);
    const carteira = await checkCarteira(lead.telefone);

    let corretor: Corretor | null = null;
    let corretorAnteriorNome: string | undefined;

    if (carteira.isExisting && carteira.corretorId) {
      // Existing client — fetch the assigned broker
      console.log(`  → Cliente existente. Corretor anterior: ${carteira.corretorId}`);
      const { data } = await supabaseAdmin
        .from('corretores')
        .select('*')
        .eq('id', carteira.corretorId)
        .single();

      if (data) {
        corretor = data as Corretor;
        corretorAnteriorNome = corretor.nome;
      }
    }

    // Step 2: Assign broker (if not already assigned from portfolio)
    if (!corretor) {
      console.log('👤 Step 2: Definindo corretor...');
      corretor = await assignCorretor();
    } else {
      console.log(`👤 Step 2: Corretor mantido da carteira: ${corretor.nome}`);
    }

    if (!corretor) {
      console.error('❌ Nenhum corretor disponível. Processamento interrompido.');
      return {
        success: false,
        corretor: null,
        isExistingClient: carteira.isExisting,
        imoveisCount: 0,
        whatsappResult: null,
        error: 'Nenhum corretor disponível',
      };
    }

    // Update the lead with the assigned broker
    await supabaseAdmin
      .from('leads')
      .update({ corretor_id: corretor.id })
      .eq('id', lead.id);

    // Step 3: Recommend properties
    console.log('🏠 Step 3: Buscando imóveis similares...');
    const imoveis = await recommendImoveis(lead);

    // Step 4: Send briefing
    console.log('📱 Step 4: Enviando briefing regionalizado...');
    const whatsappResult = await sendBriefing({
      lead,
      corretor,
      imoveis,
      isExistingClient: carteira.isExisting,
      corretorAnteriorNome,
      config, // Pass the regional config
    });

    console.log(`✅ Lead processado com sucesso! Corretor: ${corretor.nome}`);

    return {
      success: true,
      corretor,
      isExistingClient: carteira.isExisting,
      imoveisCount: imoveis.length,
      whatsappResult,
    };
  } catch (error) {
    console.error('❌ Erro no processamento do lead:', error);
    return {
      success: false,
      corretor: null,
      isExistingClient: false,
      imoveisCount: 0,
      whatsappResult: null,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
