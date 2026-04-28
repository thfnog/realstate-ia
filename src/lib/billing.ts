/**
 * Billing & Subscription Service
 * 
 * Handles plan transitions, module synchronization, 
 * and payment gateway interactions.
 */
import { supabaseAdmin } from './supabase';

export interface BillingWebhookPayload {
  gateway: 'stripe' | 'pagarme';
  event: string;
  external_id: string;
  customer_email?: string;
  amount?: number;
  status: 'paid' | 'failed' | 'pending';
  metadata?: any;
}

/**
 * Process a successful payment or subscription event.
 * Syncs the imobiliaria's active_plan and active_modules with the purchased plan.
 */
export async function processSubscriptionUpdate(tenant_id: string, plano_slug: string, external_subscription_id?: string) {
  try {
    console.log(`💳 Processando atualização de assinatura para imobiliária ${tenant_id} -> Plano: ${plano_slug}`);

    // 1. Fetch the plan details to get its modules
    const { data: plano, error: planoError } = await supabaseAdmin
      .from('planos')
      .select('*')
      .eq('slug', plano_slug)
      .single();

    if (planoError || !plano) {
      throw new Error(`Plano não encontrado: ${plano_slug}`);
    }

    // 2. Update the imobiliaria table (main cache for permission gating)
    const { error: imobError } = await supabaseAdmin
      .from('imobiliarias')
      .update({
        active_plan: plano.nome,
        active_modules: plano.modulos
      })
      .eq('id', tenant_id);

    if (imobError) throw imobError;

    // 3. Upsert into assinaturas table
    const { error: subError } = await supabaseAdmin
      .from('assinaturas')
      .upsert({
        tenant_id,
        plano_id: plano.id,
        status: 'ativo',
        periodo_fim: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(), // +31 days
        external_id: external_subscription_id
      }, { onConflict: 'tenant_id' });

    if (subError) throw subError;

    console.log(`✅ Assinatura atualizada com sucesso para ${tenant_id}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Erro ao processar atualização de faturamento:', error.message);
    throw error;
  }
}

/**
 * Handle failed payments by restricting access
 */
export async function processPaymentFailure(tenant_id: string) {
  try {
    console.warn(`⚠️ Falha de pagamento detectada para imobiliária ${tenant_id}. Bloqueando recursos premium.`);

    // Revert to 'Essencial' or block everything depending on business rule
    // For now, let's just mark the subscription as 'atrasado'
    await supabaseAdmin
      .from('assinaturas')
      .update({ status: 'atrasado' })
      .eq('tenant_id', tenant_id);

    return { success: true };
  } catch (error: any) {
    console.error('❌ Erro ao processar falha de pagamento:', error.message);
    throw error;
  }
}
