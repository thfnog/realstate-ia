import { NextResponse } from 'next/server';
import { getAuthFromCookies } from '@/lib/auth';
import * as mock from '@/lib/mockDb';
import { supabaseAdmin } from '@/lib/supabase';

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
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno ao atualizar preferências' }, { status: 500 });
  }
}
