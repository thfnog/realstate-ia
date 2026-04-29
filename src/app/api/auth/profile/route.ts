import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthFromCookies } from '@/lib/auth';
import * as mock from '@/lib/mockDb';
import bcrypt from 'bcryptjs';

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
      .select('*, corretores(*), imobiliarias(*)')
      .eq('id', session.usuario_id)
      .single();

    if (error) throw error;

    // Get active modules
    const { data: imobData } = await supabaseAdmin
      .from('imobiliarias')
      .select('*, assinaturas(*, planos(*))')
      .eq('id', user.imobiliaria_id)
      .single();
    
    const sub = Array.isArray(imobData?.assinaturas) ? imobData?.assinaturas[0] : imobData?.assinaturas;
    const activeModules = sub?.planos?.modulos || [];

    return NextResponse.json({ ...user, active_modules: activeModules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { nome, telefone, senha } = body;

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
          pref_notif_push: true,
          comissao_padrao: 5.0
        });
        corretorId = newCorretor.id;
        user.corretor_id = corretorId; // In-memory update
      } else {
        mock.updateCorretor(corretorId, { nome, telefone });
      }

      if (senha) {
        const hash = await bcrypt.hash(senha, 10);
        user.hash_senha = hash;
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
          ativo: true,
          comissao_padrao: 5.0
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
          nome,
          telefone
        })
        .eq('id', corretorId);

      if (updateError) throw updateError;
    }

    if (senha) {
      console.log(`[PROFILE] Tentando atualizar senha para usuario_id: ${session.usuario_id}`);
      
      // Get auth_id from the user record we already have or fetch it
      const { data: userWithAuth, error: authIdError } = await supabaseAdmin
        .from('usuarios')
        .select('auth_id')
        .eq('id', session.usuario_id)
        .single();
      
      if (authIdError || !userWithAuth?.auth_id) {
        console.error('[PROFILE] Erro ao buscar auth_id:', authIdError);
        throw new Error('Seu usuário não possui um ID de autenticação vinculado. Entre em contato com o suporte.');
      }

      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        userWithAuth.auth_id,
        { password: senha }
      );

      if (passwordError) {
        console.error('[PROFILE] Erro no Supabase Auth:', passwordError);
        throw new Error(`Erro na autenticação: ${passwordError.message}`);
      }
      
      console.log('[PROFILE] Senha atualizada com sucesso no Supabase Auth');
    }

    return NextResponse.json({ success: true, corretor_id: corretorId });
  } catch (err: any) {
    console.error('[PROFILE PATCH] Erro:', err);
    return NextResponse.json({ error: err.message || 'Erro ao atualizar perfil' }, { status: 500 });
  }
}
