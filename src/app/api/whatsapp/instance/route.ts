import { NextRequest, NextResponse } from 'next/server';

const EVOLUTION_URL = process.env.EVOLUTION_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

/**
 * Proxy para a Evolution API para evitar CORS e proteger a API Key.
 */
export async function GET(req: NextRequest) {
  const instanceName = req.nextUrl.searchParams.get('instance');
  if (!instanceName) return NextResponse.json({ error: 'Instance required' }, { status: 400 });

  try {
    const response = await fetch(`${EVOLUTION_URL}/instance/connectionState/${instanceName}`, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { instanceName, action } = await req.json();
  if (!instanceName) return NextResponse.json({ error: 'Instance required' }, { status: 400 });

  try {
    // Ação: Conectar (Gera QR Code)
    if (action === 'connect') {
      // 1. Garantir que a instância existe (Evolution API v2 cria se não existir em alguns endpoints)
      // Mas o correto é tentar criar primeiro
      await fetch(`${EVOLUTION_URL}/instance/create`, {
        method: 'POST',
        headers: { 
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceName,
          token: instanceName, // Usamos o próprio nome como token para simplicidade no MVP
          qrcode: true
        })
      });

      // 2. Buscar o QR Code
      const qrRes = await fetch(`${EVOLUTION_URL}/instance/connect/${instanceName}`, {
        headers: { 'apikey': EVOLUTION_API_KEY }
      });
      const qrData = await qrRes.json();
      return NextResponse.json(qrData);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const instanceName = req.nextUrl.searchParams.get('instance');
  if (!instanceName) return NextResponse.json({ error: 'Instance required' }, { status: 400 });

  try {
    const response = await fetch(`${EVOLUTION_URL}/instance/logout/${instanceName}`, {
      method: 'POST', // Evolution logout é POST
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    
    // Deletar também para limpar a VPS
    await fetch(`${EVOLUTION_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': EVOLUTION_API_KEY }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
