import { NextResponse } from 'next/server';

/**
 * Endpoint de diagnóstico direto — chama a Evolution API sem abstração
 * para expor o erro bruto no frontend.
 */
export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone) return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 });

    const EVOLUTION_URL = process.env.EVOLUTION_URL?.replace(/\/$/, '');
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
    const INSTANCE = process.env.WHATSAPP_DEFAULT_INSTANCE || '';

    // Step 0: Report env config
    const envReport = {
      EVOLUTION_URL: EVOLUTION_URL || '❌ NÃO CONFIGURADA',
      EVOLUTION_API_KEY: EVOLUTION_API_KEY ? `✅ (${EVOLUTION_API_KEY.slice(0, 6)}...)` : '❌ NÃO CONFIGURADA',
      WHATSAPP_DEFAULT_INSTANCE: INSTANCE || '❌ NÃO CONFIGURADA',
      WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER || 'evolution (default)',
    };

    if (!EVOLUTION_URL || !EVOLUTION_API_KEY || !INSTANCE) {
      return NextResponse.json({
        success: false,
        step: 'ENV_CHECK',
        error: 'Variáveis de ambiente ausentes',
        envReport,
      });
    }

    // Step 1: Check instance connectivity
    const statusUrl = `${EVOLUTION_URL}/instance/connectionState/${INSTANCE}`;
    let instanceStatus: any = null;
    try {
      const statusRes = await fetch(statusUrl, {
        headers: { 'apikey': EVOLUTION_API_KEY },
      });
      instanceStatus = {
        httpStatus: statusRes.status,
        body: await statusRes.json().catch(() => statusRes.text()),
      };
    } catch (err: any) {
      instanceStatus = { error: `UNREACHABLE: ${err.message}` };
    }

    // Step 2: Try sending with v2 payload (textMessage + options)
    const cleanTo = phone.replace(/\D/g, '');
    const sendUrl = `${EVOLUTION_URL}/message/sendText/${INSTANCE}`;
    const payloadV2 = {
      number: `${cleanTo}@s.whatsapp.net`,
      text: 'Diagnóstico ImobIA - Teste direto v2 🚀',
      textMessage: { text: 'Diagnóstico ImobIA - Teste direto v2 🚀' },
      options: { delay: 1200, presence: 'composing', linkPreview: false },
    };

    let sendResultV2: any = null;
    try {
      const sendRes = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify(payloadV2),
      });
      const resBody = await sendRes.text();
      sendResultV2 = {
        httpStatus: sendRes.status,
        body: tryParseJSON(resBody),
        url: sendUrl,
        payload: payloadV2,
      };
    } catch (err: any) {
      sendResultV2 = { error: `FETCH_FAILED: ${err.message}`, url: sendUrl };
    }

    // Step 3: If v2 failed (non-2xx), try v1 format (number without @s.whatsapp.net)
    let sendResultV1: any = null;
    if (sendResultV2?.httpStatus && sendResultV2.httpStatus >= 400) {
      const payloadV1 = {
        number: cleanTo,
        text: 'Diagnóstico ImobIA - Teste direto v1 🚀',
        delay: 1200,
        linkPreview: false,
      };
      try {
        const sendRes = await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
          body: JSON.stringify(payloadV1),
        });
        const resBody = await sendRes.text();
        sendResultV1 = {
          httpStatus: sendRes.status,
          body: tryParseJSON(resBody),
          url: sendUrl,
          payload: payloadV1,
        };
      } catch (err: any) {
        sendResultV1 = { error: `FETCH_FAILED: ${err.message}` };
      }
    }

    return NextResponse.json({
      success: (sendResultV2?.httpStatus === 200 || sendResultV2?.httpStatus === 201) ||
               (sendResultV1?.httpStatus === 200 || sendResultV1?.httpStatus === 201),
      envReport,
      instanceStatus,
      sendResultV2,
      sendResultV1: sendResultV1 || 'SKIPPED (v2 succeeded)',
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function tryParseJSON(text: string) {
  try { return JSON.parse(text); } catch { return text; }
}
