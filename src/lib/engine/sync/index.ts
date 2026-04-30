import { supabaseAdmin } from '@/lib/supabase';
import { ImobiliariaIntegracao, IntegracaoProvider, Imovel } from '@/lib/database.types';
import { syncWidesys } from './providers/widesys';

export interface SyncResult {
  provider: IntegracaoProvider;
  totalFetched: number;
  totalUpdated: number;
  totalInserted: number;
  totalDeactivated: number;
  success: boolean;
  error?: string;
}

export async function runSyncForImobiliaria(imobiliariaId?: string, providerId?: IntegracaoProvider): Promise<SyncResult[]> {
  let query = supabaseAdmin
    .from('imobiliaria_integracoes')
    .select('*')
    .eq('active', true);

  if (imobiliariaId) {
    query = query.eq('imobiliaria_id', imobiliariaId);
  }

  if (providerId) {
    query = query.eq('provider', providerId);
  }

  const { data: configs, error } = await query;

  if (error || !configs || configs.length === 0) {
    console.log(`Nenhuma integração ativa encontrada para imobiliaria ${imobiliariaId}.`);
    return [];
  }

  const results: SyncResult[] = [];

  for (const config of configs as ImobiliariaIntegracao[]) {
    try {
      console.log(`🚀 Iniciando sync para provedor: ${config.provider}`);
      let result: SyncResult;

      switch (config.provider) {
        case 'widesys':
          result = await syncWidesys(config);
          break;
        // Add other providers here in the future
        default:
          throw new Error(`Provedor ${config.provider} não implementado.`);
      }

      results.push(result);

      // Update last sync time
      await supabaseAdmin
        .from('imobiliaria_integracoes')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', config.id);

    } catch (err: any) {
      console.error(`❌ Erro no sync do provedor ${config.provider}:`, err);
      results.push({
        provider: config.provider,
        totalFetched: 0,
        totalUpdated: 0,
        totalInserted: 0,
        totalDeactivated: 0,
        success: false,
        error: err.message
      });
    }
  }

  return results;
}
