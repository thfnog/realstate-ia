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
import * as mock from '@/lib/mockDb';
import type { Lead, Corretor } from '@/lib/database.types';
import { checkCarteira } from './checkCarteira';
import { assignCorretor } from './assignCorretor';
import { recommendImoveis } from './recommendImoveis';
import { sendBriefing } from './sendBriefing';
import { sendAutoReplyToLead } from './sendAutoReply';
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
    let config_pais = 'PT';
    if (mock.isMockMode()) {
      const imob = mock.getImobiliariaById(lead.imobiliaria_id);
      config_pais = imob?.config_pais || 'PT';
    } else {
      const { data: imob } = await supabaseAdmin
        .from('imobiliarias')
        .select('config_pais')
        .eq('id', lead.imobiliaria_id)
        .single();
      config_pais = imob?.config_pais || 'PT';
    }
    
    const config = getConfigByCode(config_pais);

    // Step 1: Check portfolio
    console.log(`📋 Step 1: Verificando carteira (${config.flag} ${config.label})...`);
    const carteira = await checkCarteira(lead.telefone, lead.imobiliaria_id);

    let corretor: Corretor | null = null;
    let corretorAnteriorNome: string | undefined;

    if (carteira.isExisting && carteira.corretorId) {
      // Existing client — fetch the assigned broker
      let data: Corretor | null = null;
      
      if (mock.isMockMode()) {
        data = mock.getCorretorById(carteira.corretorId) || null;
      } else {
        const { data: dbCorretor } = await supabaseAdmin
          .from('corretores')
          .select('*')
          .eq('id', carteira.corretorId)
          .eq('ativo', true)
          .single();
        data = dbCorretor as Corretor;
      }

      if (data && data.ativo) {
        console.log(`  → Cliente existente. Corretor mantido da carteira: ${data.nome}`);
        corretor = data as Corretor;
        corretorAnteriorNome = corretor.nome;
      } else {
        console.log(`  → Cliente existente, mas corretor anterior (${carteira.corretorId}) está inativo ou não existe nas tabelas desta agência.`);
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
    if (mock.isMockMode()) {
      mock.updateLead(lead.id, { corretor_id: corretor.id });
    } else {
      await supabaseAdmin
        .from('leads')
        .update({ corretor_id: corretor.id })
        .eq('id', lead.id);
    }

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
    
    // Step 5: Send auto-reply to Lead (First-person, personalized)
    console.log('📱 Step 5: Enviando resposta automática pessoal ao Lead...');
    await sendAutoReplyToLead({
      lead,
      corretor,
      config,
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
