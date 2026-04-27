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

    // 1. If no ID provided, check if a broker with this email already exists
    if (!finalCorretorId && email) {
      const { data: existingBroker } = await supabaseAdmin
        .from('corretores')
        .select('id')
        .eq('email', email)
        .eq('imobiliaria_id', session.imobiliaria_id)
        .maybeSingle();
      
      if (existingBroker) {
        finalCorretorId = existingBroker.id;
        console.log(`[INVITE] Found existing broker for email ${email}: ${finalCorretorId}`);
      }
    }
    
    // 2. Create a broker record if specifically requested or if it's a broker role without an ID
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

    // Attempt to invite. If user already exists, we still want to ensure the DB record is linked.
    let inviteData = null;
    let inviteError = null;
    let manualLink = null;

    try {
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          imobiliaria_id: session.imobiliaria_id,
          role: role,
          corretor_id: finalCorretorId || null,
          display_name: nome || email.split('@')[0],
        },
        redirectTo: `${new URL(request.url).origin}/auth/confirm`,
      });
      inviteData = data;
      inviteError = error;
    } catch (err: any) {
      inviteError = err;
    }

    let authUserId = inviteData?.user?.id;

    // FALLBACK: If invite fails due to Rate Limit, generate a manual link
    if (inviteError && (inviteError.status === 429 || inviteError.message.toLowerCase().includes('rate limit'))) {
      console.warn('[INVITE] Email rate limit hit. Generating manual link...');
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
          data: {
            imobiliaria_id: session.imobiliaria_id,
            role: role,
            corretor_id: finalCorretorId || null,
            display_name: nome || email.split('@')[0],
          },
          redirectTo: `${new URL(request.url).origin}/auth/confirm`,
        }
      });

      if (!linkError && linkData) {
        manualLink = linkData.properties.action_link;
        authUserId = linkData.user.id;
        inviteError = null; // Clear error as we have a fallback
      }
    }

    if (inviteError) {
      // If user already exists, we try to find their ID to perform the upsert anyway
      if (inviteError.message.includes('already registered') || inviteError.status === 422) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = listData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (existingUser) {
          authUserId = existingUser.id;
        } else {
          return NextResponse.json({ error: 'Usuário já existe mas não pôde ser vinculado.' }, { status: 400 });
        }
      } else {
        console.error('[INVITE] Erro Supabase:', inviteError);
        return NextResponse.json({ error: inviteError.message }, { status: 500 });
      }
    }

    // MANUAL INSERT (Backup to trigger): Ensure the user record exists in public.usuarios
    if (authUserId) {
      try {
        await supabaseAdmin
          .from('usuarios')
          .upsert({
            id: authUserId,
            auth_id: authUserId,
            email: email,
            imobiliaria_id: session.imobiliaria_id,
            role: role,
            corretor_id: finalCorretorId || null
          }, { onConflict: 'email' });
      } catch (dbErr) {
        console.warn('[INVITE] Failed manual DB insert:', dbErr);
      }
    }

    return NextResponse.json({ 
      success: true, 
      user: inviteData?.user || { id: authUserId, email },
      manualLink: manualLink // Return the link if email failed
    });
  } catch (err: any) {
    console.error('[INVITE] Erro crítico:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
