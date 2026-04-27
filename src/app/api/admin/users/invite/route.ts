import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthFromCookies } from '@/lib/auth';
import { isMockMode } from '@/lib/mockDb';

export async function POST(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session || (session.app_role !== 'admin' && session.app_role !== 'master')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { email, role, corretor_id, nome, vincular_corretor } = await request.json();

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
    let finalCorretorId = corretor_id;
    
    // Create a broker record if specifically requested or if it's a broker role without an ID
    if ((vincular_corretor || role === 'corretor') && !finalCorretorId) {
      const { data: newBroker, error: brokerError } = await supabaseAdmin
        .from('corretores')
        .insert({
          imobiliaria_id: session.imobiliaria_id,
          nome: nome || email.split('@')[0],
          email: email,
          telefone: '—',
          ativo: true
        })
        .select()
        .single();
        
      if (brokerError) {
        console.error('[INVITE] Erro ao criar corretor:', brokerError);
        return NextResponse.json({ error: 'Erro ao pré-cadastrar perfil de corretor' }, { status: 500 });
      }
      finalCorretorId = newBroker.id;
    }

    // We call invite FIRST. If it succeeds, the DB trigger 'on_auth_user_created' 
    // will automatically create the profile in 'public.usuarios'.
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        imobiliaria_id: session.imobiliaria_id,
        role: role,
        corretor_id: finalCorretorId || null,
        display_name: nome || email.split('@')[0],
      },
      redirectTo: `${new URL(request.url).origin}/auth/confirm`,
    });

    if (inviteError) {
      console.error('[INVITE] Erro Supabase:', inviteError);
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    // MANUAL INSERT (Backup to trigger): Ensure the user record exists in public.usuarios
    // This solves the issue of users not appearing immediately if the trigger delays.
    try {
      await supabaseAdmin
        .from('usuarios')
        .upsert({
          id: inviteData.user.id, // Auth ID as primary ID for consistency
          auth_id: inviteData.user.id,
          email: email,
          imobiliaria_id: session.imobiliaria_id,
          role: role,
          corretor_id: finalCorretorId || null
        }, { onConflict: 'email' });
    } catch (dbErr) {
      console.warn('[INVITE] Failed manual DB insert (trigger might have handled it):', dbErr);
    }

    return NextResponse.json({ success: true, user: inviteData.user });
  } catch (err: any) {
    console.error('[INVITE] Erro crítico:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
