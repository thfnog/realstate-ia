import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// This is a simplified endpoint. A real one should check auth properly.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imobiliaria_id = searchParams.get('imobiliaria_id');

    if (!imobiliaria_id) {
      return NextResponse.json({ error: 'imobiliaria_id is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('imobiliaria_integracoes')
      .select('*')
      .eq('imobiliaria_id', imobiliaria_id)
      .eq('provider', 'widesys')
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json(data || { provider: 'widesys', active: false, config: {} });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imobiliaria_id, config, active } = body;

    if (!imobiliaria_id) {
      return NextResponse.json({ error: 'imobiliaria_id is required' }, { status: 400 });
    }

    // Upsert the integration
    const { data, error } = await supabaseAdmin
      .from('imobiliaria_integracoes')
      .upsert({
        imobiliaria_id,
        provider: 'widesys',
        config,
        active,
        updated_at: new Date().toISOString()
      }, { onConflict: 'imobiliaria_id, provider' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
