import { NextResponse } from 'next/server';
import { getAuthFromCookies } from '@/lib/auth';
import * as mock from '@/lib/mockDb';
import { supabaseAdmin } from '@/lib/supabase';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAuthFromCookies();
  
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    if (mock.isMockMode()) {
      mock.seedTestData();
      let corretor = session.corretor_id ? mock.getCorretorById(session.corretor_id) : null;
      if (!corretor) {
        const all = mock.getCorretores();
        corretor = all.find(c => c.imobiliaria_id === session.imobiliaria_id) || all[0] || null;
      }

      return NextResponse.json({
        id: corretor?.id || null,
        nome: corretor?.nome || null,
        whatsapp_status: corretor?.whatsapp_status || 'close',
        whatsapp_instance: corretor?.whatsapp_instance || null,
        whatsapp_number: corretor?.whatsapp_number || null,
        pref_notif_whatsapp: corretor?.pref_notif_whatsapp ?? true,
        pref_notif_email: corretor?.pref_notif_email ?? true,
        pref_notif_push: corretor?.pref_notif_push ?? true,
      });
    }

    if (session.corretor_id) {
      const { data: corretor, error } = await supabaseAdmin
        .from('corretores')
        .select('id, nome, whatsapp_status, whatsapp_instance, whatsapp_number, pref_notif_whatsapp, pref_notif_email, pref_notif_push')
        .eq('id', session.corretor_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching broker preferences:', error);
      }

      return NextResponse.json({
        id: corretor?.id || session.corretor_id,
        nome: corretor?.nome || null,
        whatsapp_status: corretor?.whatsapp_status || 'close',
        whatsapp_instance: corretor?.whatsapp_instance || null,
        whatsapp_number: corretor?.whatsapp_number || null,
        pref_notif_whatsapp: corretor?.pref_notif_whatsapp ?? true,
        pref_notif_email: corretor?.pref_notif_email ?? true,
        pref_notif_push: corretor?.pref_notif_push ?? true,
      });
    }

    // Admin / Master without linked corretor_id: check the primary active broker for this imobiliaria
    const { data: corretores, error } = await supabaseAdmin
      .from('corretores')
      .select('id, nome, whatsapp_status, whatsapp_instance, whatsapp_number, pref_notif_whatsapp, pref_notif_email, pref_notif_push')
      .eq('imobiliaria_id', session.imobiliaria_id)
      .eq('ativo', true)
      .order('criado_em', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Error fetching agency broker preferences:', error);
    }

    const mainBroker = corretores?.[0];
    return NextResponse.json({
      id: mainBroker?.id || null,
      nome: mainBroker?.nome || null,
      whatsapp_status: mainBroker?.whatsapp_status || 'close',
      whatsapp_instance: mainBroker?.whatsapp_instance || null,
      whatsapp_number: mainBroker?.whatsapp_number || null,
      pref_notif_whatsapp: mainBroker?.pref_notif_whatsapp ?? true,
      pref_notif_email: mainBroker?.pref_notif_email ?? true,
      pref_notif_push: mainBroker?.pref_notif_push ?? true,
    });
  } catch (err: any) {
    console.error('GET /api/corretores/me/preferences error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getAuthFromCookies();
  
  if (!session || !session.corretor_id) {
    return NextResponse.json({ error: 'Não autorizado ou usuário não é um corretor' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { pref_notif_whatsapp, pref_notif_email, pref_notif_push } = body;

    const updateData = {
      pref_notif_whatsapp: pref_notif_whatsapp ?? true,
      pref_notif_email: pref_notif_email ?? true,
      pref_notif_push: pref_notif_push ?? true,
    };

    if (mock.isMockMode()) {
      const updated = mock.updateCorretor(session.corretor_id, updateData);
      return NextResponse.json(updated);
    }

    const { data, error } = await supabaseAdmin
      .from('corretores')
      .update(updateData)
      .eq('id', session.corretor_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro interno ao atualizar preferências' }, { status: 500 });
  }
}
