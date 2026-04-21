import { NextRequest, NextResponse } from 'next/server';

const EVOLUTION_URL = process.env.EVOLUTION_URL?.replace(/\/$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

function getUrl(path: string) {
  return `${EVOLUTION_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Proxy para a Evolution API para evitar CORS e proteger a API Key.
 */
export async function GET(req: NextRequest) {
  const instanceName = req.nextUrl.searchParams.get('instance');
  if (!instanceName) return NextResponse.json({ error: 'Instance required' }, { status: 400 });

  if (!EVOLUTION_URL || !EVOLUTION_API_KEY) {
    console.error('❌ GET: EVOLUTION_URL ou EVOLUTION_API_KEY não configurados na Vercel.');
    return NextResponse.json({ error: 'Configuração de WhatsApp ausente no servidor.' }, { status: 500 });
  }

  try {
    const response = await fetch(getUrl(`/instance/connectionState/${instanceName}`), {
      headers: { 'apikey': EVOLUTION_API_KEY! }
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ GET Evolution API Error:', error);
    return NextResponse.json({ error: `Falha na comunicação: ${error.message}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { instanceName, action } = await req.json();
  if (!instanceName) return NextResponse.json({ error: 'Instance required' }, { status: 400 });

  if (!EVOLUTION_URL || !EVOLUTION_API_KEY) {
    console.error('❌ POST: Configuração ausente.');
    return NextResponse.json({ error: 'Configuração de WhatsApp ausente no servidor.' }, { status: 500 });
  }

  try {
    // Ação: Conectar (Gera QR Code)
    if (action === 'connect') {
      console.log(`🚀 Iniciando conexão para instância: ${instanceName}`);
      
      // 1. Garantir que a instância existe
      const createRes = await fetch(getUrl('/instance/create'), {
        method: 'POST',
        headers: { 
          'apikey': EVOLUTION_API_KEY!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceName,
          token: instanceName, 
          integration: 'WHATSAPP-BAILEYS',
          qrcode: true
        })
      });

      if (createRes.ok) {
        console.log(`✅ Instância ${instanceName} criada com sucesso. Aguardando provisionamento...`);
        // Aguarda 1.5s para o servidor processar a nova instância
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else if (createRes.status === 400) {
        console.log(`ℹ️ Instância ${instanceName} já existe. Seguindo para conexão.`);
      } else {
        const err = await createRes.text();
        console.error('❌ Erro ao criar instância:', err);
        return NextResponse.json({ error: 'Falha ao criar instância no servidor WhatsApp.' }, { status: 500 });
      }

      // 1.1 Configurar Webhook para esta instância (Evolution v2 syntax)
      const webhookUrl = `${req.nextUrl.origin}/api/webhooks/whatsapp`;
      console.log(`🔗 Configurando Webhook em: ${webhookUrl}`);
      
      try {
        const webhookRes = await fetch(getUrl(`/webhook/set/${instanceName}`), {
          method: 'POST',
          headers: { 
            'apikey': EVOLUTION_API_KEY!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: webhookUrl,
              byEvents: false,
              base64: false,
              events: [
                "messages.upsert",
                "send.messages"
              ]
            }
          })
        });

        if (webhookRes.ok) {
          console.log('✅ Webhook configurado com sucesso na Evolution API.');
        } else {
          const webhookErrBody = await webhookRes.text();
          console.error(`❌ Erro ao configurar Webhook (Status ${webhookRes.status}):`, webhookErrBody);
        }
      } catch (webhookErr) {
        console.error('⚠️ Falha crítica ao disparar configuração de Webhook:', webhookErr);
      }

      // 2. Buscar o QR Code (com retry em caso de 404 temporário)
      let qrRes = await fetch(getUrl(`/instance/connect/${instanceName}`), {
        headers: { 'apikey': EVOLUTION_API_KEY! }
      });
      
      if (qrRes.status === 404) {
        console.warn(`⚠️ Instância não encontrada no primeiro connect. Tentando novamente em 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        qrRes = await fetch(getUrl(`/instance/connect/${instanceName}`), {
          headers: { 'apikey': EVOLUTION_API_KEY! }
        });
      }

      if (!qrRes.ok) {
        const err = await qrRes.text();
        console.error('❌ Erro ao buscar QR Code:', err);
        return NextResponse.json({ error: 'Falha ao gerar QR Code. Tente novamente.' }, { status: 500 });
      }

      const qrData = await qrRes.json();
      return NextResponse.json(qrData);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('❌ POST Evolution API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const instanceName = req.nextUrl.searchParams.get('instance');
  if (!instanceName) return NextResponse.json({ error: 'Instance required' }, { status: 400 });

  try {
    const response = await fetch(getUrl(`/instance/logout/${instanceName}`), {
      method: 'POST', // Evolution logout é POST
      headers: { 'apikey': EVOLUTION_API_KEY! }
    });
    
    // Deletar também para limpar a VPS
    await fetch(getUrl(`/instance/delete/${instanceName}`), {
      method: 'DELETE',
      headers: { 'apikey': EVOLUTION_API_KEY! }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
