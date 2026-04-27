import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthFromCookies } from '@/lib/auth';
import { isMockMode } from '@/lib/mockDb';

export async function GET() {
  try {
    const session = await getAuthFromCookies();
    if (!session || (session.app_role !== 'admin' && session.app_role !== 'master')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    if (isMockMode()) {
      const { getCorretores } = await import('@/lib/mockDb');
      const corretores = getCorretores(session.imobiliaria_id);
      const mockUsers = corretores.map(c => ({
        id: `user-${c.id}`,
        email: c.email || 'sem@email.com',
        role: 'corretor',
        corretor_id: c.id,
        nome: c.nome,
        status: 'active',
        criado_em: c.criado_em,
      }));
      return NextResponse.json(mockUsers);
    }

    // REAL MODE: Fetch from public.usuarios with Corretores join
    const { data: dbUsers, error } = await supabaseAdmin
      .from('usuarios')
      .select('*, corretores(nome)')
      .eq('imobiliaria_id', session.imobiliaria_id)
      .order('criado_em', { ascending: false });

    if (error) throw error;

    // Fetch auth status for these users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.warn('[USERS GET] Error listing auth users:', authError.message);
      return NextResponse.json(dbUsers);
    }

    const authUsersMap = new Map(authData.users.map(u => [u.id, u]));

    const usersWithStatus = dbUsers.map(u => {
      const authUser = u.auth_id ? authUsersMap.get(u.auth_id) : null;
      return {
        ...u,
        status: (authUser?.email_confirmed_at || authUser?.last_sign_in_at) ? 'active' : 'pending'
      };
    });

    return NextResponse.json(usersWithStatus);
  } catch (err: any) {
    console.error('[USERS GET] Erro:', err);
    return NextResponse.json({ error: 'Erro ao carregar usuários' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session || (session.app_role !== 'admin' && session.app_role !== 'master')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    if (userId === session.usuario_id) {
      return NextResponse.json({ error: 'Você não pode excluir o seu próprio usuário enquanto está logado' }, { status: 400 });
    }

    if (isMockMode()) {
      // Logic for Mock mode
      return NextResponse.json({ success: true });
    }

    // REAL MODE: 
    // 1. Get the user to find the auth_id
    const { data: user, error: getError } = await supabaseAdmin
      .from('usuarios')
      .select('auth_id')
      .eq('id', userId)
      .single();

    if (getError && getError.code !== 'PGRST116') throw getError;

    // 2. Delete from auth.users (if it exists)
    if (user?.auth_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.auth_id);
      // We don't throw if auth user is already gone, just log it
      if (authError) console.warn('[USERS DELETE] Auth user not found or error:', authError.message);
    }

    // 3. Delete from public.usuarios explicitly (even if it's supposed to cascade)
    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .delete()
      .eq('id', userId);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[USERS DELETE] Erro:', err);
    return NextResponse.json({ error: err.message || 'Erro ao deletar usuário' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session || (session.app_role !== 'admin' && session.app_role !== 'master')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { userId, action } = await request.json();

    if (action === 'resend_invite') {
      const { data: user, error: getError } = await supabaseAdmin
        .from('usuarios')
        .select('email, role, imobiliaria_id, corretor_id')
        .eq('id', userId)
        .single();

      if (getError) throw getError;

      if (isMockMode()) {
        return NextResponse.json({ success: true });
      }

      // Re-send invite via Supabase
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(user.email, {
        data: {
          role: user.role,
          imobiliaria_id: user.imobiliaria_id,
          corretor_id: user.corretor_id
        },
        redirectTo: `${new URL(request.url).origin}/auth/confirm`,
      });

      if (inviteError) throw inviteError;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err: any) {
    console.error('[USERS PUT] Erro:', err);
    return NextResponse.json({ error: err.message || 'Erro ao processar ação' }, { status: 500 });
  }
}
