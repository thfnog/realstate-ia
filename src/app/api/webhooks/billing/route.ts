import { NextResponse } from 'next/server';
import { processSubscriptionUpdate, processPaymentFailure } from '@/lib/billing';

/**
 * Global Billing Webhook
 * Supports Stripe and Pagar.me events
 */
export async function POST(request: Request) {
  try {
    // 1. Verify Authentication (Signature check would go here)
    const signature = request.headers.get('stripe-signature') || request.headers.get('x-pagarme-signature');
    
    if (!signature && process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Webhook de cobrança recebido sem assinatura válida.');
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const eventType = payload.type || payload.event;
    
    console.log(`💳 Webhook de cobrança recebido: ${eventType}`);

    // This is a mapping placeholder. In a real integration, 
    // you would use the gateway's SDK to retrieve the tenant_id from metadata or customer tags.
    const tenant_id = payload.data?.object?.metadata?.tenant_id || payload.metadata?.tenant_id;
    const plan_slug = payload.data?.object?.metadata?.plan_slug || payload.metadata?.plan_slug;

    if (!tenant_id || !plan_slug) {
      console.log('ℹ️ Webhook ignorado: Metadados insuficientes (tenant_id/plan_slug não encontrados).');
      return NextResponse.json({ received: true, status: 'ignored' });
    }

    // 2. Routing based on event type
    switch (eventType) {
      case 'checkout.session.completed':
      case 'invoice.paid':
      case 'subscription.created':
      case 'subscription.updated':
        await processSubscriptionUpdate(tenant_id, plan_slug, payload.id);
        break;

      case 'invoice.payment_failed':
      case 'subscription.deleted':
        await processPaymentFailure(tenant_id);
        break;

      default:
        console.log(`ℹ️ Evento não tratado: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('❌ Erro no processamento do webhook de billing:', err.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * Handle GET for verification if needed by gateways
 */
export async function GET() {
  return new Response('Billing Webhook Active', { status: 200 });
}
