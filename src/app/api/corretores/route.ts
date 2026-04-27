import { NextResponse } from 'next/server';
import { getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getCorretorRepository } from '@/lib/repositories/factory';
import { getAuthFromCookies } from '@/lib/auth';

// GET: List all brokers
export async function GET() {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value || '';
  const client = getUserSupabaseClient(token);
  const repository = getCorretorRepository(client);

  const data = await repository.findAll(session.imobiliaria_id);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  
  try {
    const body = await request.json();

    if (!body.nome || !body.telefone) {
      return NextResponse.json(
        { error: 'Nome e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const { supabaseAdmin } = await import('@/lib/supabase');
    const repository = getCorretorRepository(client);

    // SECURITY CHECK: Email Uniqueness & Linking
    if (body.email) {
      // 1. Check if another broker already uses this email in this agency
      const { data: existingBroker } = await client
        .from('corretores')
        .select('id, nome')
        .eq('email', body.email)
        .eq('imobiliaria_id', session.imobiliaria_id)
        .maybeSingle();
      
      if (existingBroker) {
        return NextResponse.json({ error: `Este e-mail já está em uso pelo corretor ${existingBroker.nome}.` }, { status: 400 });
      }

      // 2. Check if a user account already exists with this email
      const { data: existingUser } = await supabaseAdmin
        .from('usuarios')
        .select('id, corretor_id, role')
        .eq('email', body.email)
        .eq('imobiliaria_id', session.imobiliaria_id)
        .maybeSingle();
      
      if (existingUser && existingUser.corretor_id) {
        return NextResponse.json({ error: 'Este e-mail já está vinculado a um usuário com outro perfil de corretor.' }, { status: 400 });
      }
    }

    const corretor = await repository.create({
      imobiliaria_id: session.imobiliaria_id,
      nome: body.nome,
      telefone: body.telefone,
      email: body.email || null,
      ativo: body.ativo ?? true,
    });

    // AUTO-LINK: If a user exists with this email, link them to the new broker profile
    if (body.email) {
      const { data: userToLink } = await supabaseAdmin
        .from('usuarios')
        .select('id')
        .eq('email', body.email)
        .eq('imobiliaria_id', session.imobiliaria_id)
        .maybeSingle();
      
      if (userToLink) {
        await supabaseAdmin
          .from('usuarios')
          .update({ corretor_id: corretor.id })
          .eq('id', userToLink.id);
        console.log(`[CORRETOR] Auto-linked user ${userToLink.id} to new broker ${corretor.id}`);
      }
    }

    return NextResponse.json(corretor, { status: 201 });
  } catch (err: any) {
    console.error('SERVER ERROR POST CORRETOR:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
