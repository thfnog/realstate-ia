import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthFromCookies } from '@/lib/auth';
import * as mock from '@/lib/mockDb';

export async function GET() {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (mock.isMockMode()) {
      mock.seedTestData();
      const user = mock.getUsuarioById(session.usuario_id);
      if (!user) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      
      const corretor = user.corretor_id ? mock.getCorretorById(user.corretor_id) : null;
      return NextResponse.json({ ...user, corretores: corretor });
    }

    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .select('*, corretores(*)')
      .eq('id', session.usuario_id)
      .single();

    if (error) throw error;
    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { nome, telefone } = body;

    if (mock.isMockMode()) {
      mock.seedTestData();
      const user = mock.getUsuarioById(session.usuario_id);
      if (!user) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

      let corretorId = user.corretor_id;

      if (!corretorId) {
        const newCorretor = mock.createCorretor({
          imobiliaria_id: user.imobiliaria_id,
          nome: nome || user.email.split('@')[0],
          telefone: telefone || '—',
          email: user.email,
          ativo: true,
          pref_notif_whatsapp: true,
          pref_notif_email: true,
          pref_notif_push: true
        });
        corretorId = newCorretor.id;
        user.corretor_id = corretorId; // In-memory update
      } else {
        mock.updateCorretor(corretorId, { nome, telefone });
      }

      return NextResponse.json({ success: true, corretor_id: corretorId });
    }

    // REAL MODE: Find user to get corretor_id
    const { data: user, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('corretor_id, imobiliaria_id, email')
      .eq('id', session.usuario_id)
      .single();

    if (userError) throw userError;

    let corretorId = user.corretor_id;

    // 2. If no corretor_id exists (e.g. admin without broker profile), create one
    if (!corretorId) {
      const { data: newCorretor, error: createError } = await supabaseAdmin
        .from('corretores')
        .insert({
          imobiliaria_id: user.imobiliaria_id,
          nome: nome || user.email.split('@')[0],
          telefone: telefone || '—',
          email: user.email,
          ativo: true
        })
        .select()
        .single();

      if (createError) throw createError;
      corretorId = newCorretor.id;

      // Link user to new corretor
      await supabaseAdmin
        .from('usuarios')
        .update({ corretor_id: corretorId })
        .eq('id', session.usuario_id);
    } else {
      // 3. Update existing broker record
      const { error: updateError } = await supabaseAdmin
        .from('corretores')
        .update({
          nome: nome,
          telefone: telefone
        })
        .eq('id', corretorId);

      if (updateError) throw updateError;
    }

    return NextResponse.json({ success: true, corretor_id: corretorId });
  } catch (err: any) {
    console.error('[PROFILE PATCH] Erro:', err);
    return NextResponse.json({ error: err.message || 'Erro ao atualizar perfil' }, { status: 500 });
  }
}
