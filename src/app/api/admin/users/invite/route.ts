import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthFromCookies } from '@/lib/auth';
import { isMockMode } from '@/lib/mockDb';

export async function POST(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session || session.app_role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { email, role, corretor_id, nome } = await request.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'Email e Role são obrigatórios' }, { status: 400 });
    }

    if (isMockMode()) {
      // Logic for Mock mode
      const { createUsuario } = await import('@/lib/mockDb');
      const newUser = createUsuario({
        imobiliaria_id: session.imobiliaria_id,
        email,
        hash_senha: 'password123', // Default for mock
        role: role as any,
        corretor_id: corretor_id || null,
        auth_id: null,
      });
      return NextResponse.json({ success: true, user: newUser });
    }

    // REAL MODE: Supabase Auth Invitation
    // We no longer pre-create the profile here. 
    // We call invite FIRST. If it succeeds, the DB trigger 'on_auth_user_created' 
    // will automatically create the profile in 'public.usuarios'.
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        imobiliaria_id: session.imobiliaria_id,
        role: role,
        corretor_id: corretor_id || null,
        display_name: nome || email.split('@')[0],
      },
      redirectTo: `${new URL(request.url).origin}/auth/confirm`,
    });

    if (inviteError) {
      console.error('[INVITE] Erro Supabase:', inviteError);
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: inviteData.user });
  } catch (err: any) {
    console.error('[INVITE] Erro crítico:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
