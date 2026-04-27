import { NextResponse } from 'next/server';
import { getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getCorretorRepository } from '@/lib/repositories/factory';
import { getAuthFromCookies } from '@/lib/auth';
import { fetchInstanceOwner } from '@/lib/whatsapp';

// GET: Get a broker by ID
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getCorretorRepository(client);

    const corretor = await repository.findById(id, session.imobiliaria_id);
    if (!corretor) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    return NextResponse.json(corretor);
  } catch (err) {
    console.error('SERVER ERROR GET CORRETOR:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT: Update a broker
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getCorretorRepository(client);

    const updated = await repository.update(id, session.imobiliaria_id, {
      nome: body.nome,
      telefone: body.telefone,
      email: body.email || null,
      ativo: body.ativo ?? true,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('API PUT Error:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

// DELETE: Delete a broker
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthFromCookies();
    if (!session || (session.app_role !== 'admin' && session.app_role !== 'master')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    
    // 1. Find linked users
    const { data: users } = await client
      .from('usuarios')
      .select('id, auth_id, role')
      .eq('corretor_id', id);

    if (users && users.length > 0) {
      const { supabaseAdmin } = await import('@/lib/supabase');
      
      for (const u of users) {
        if (u.role === 'admin') {
          // Just unlink
          await supabaseAdmin
            .from('usuarios')
            .update({ corretor_id: null })
            .eq('id', u.id);
        } else {
          // Delete broker-only user
          if (u.auth_id) {
            await supabaseAdmin.auth.admin.deleteUser(u.auth_id);
          }
          await supabaseAdmin
            .from('usuarios')
            .delete()
            .eq('id', u.id);
        }
      }
    }

    const repository = getCorretorRepository(client);
    await repository.delete(id, session.imobiliaria_id);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('SERVER ERROR DELETE CORRETOR:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

// PATCH: Partial update (e.g., whatsapp_status)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getCorretorRepository(client);

    // --- LÓGICA DE SEGURANÇA WHATSAPP (STRICT 1:1) ---
    if (body.whatsapp_status === 'open') {
      const currentBroker = await repository.findById(id, session.imobiliaria_id);

      if (currentBroker && currentBroker.whatsapp_instance) {
        // 1. Descobrir qual número realmente conectou
        const ownerJid = await fetchInstanceOwner(currentBroker.whatsapp_instance);
        const connectedNumber = ownerJid ? ownerJid.split('@')[0] : null;

        if (connectedNumber) {
          // 2. Verificar se esse número já pertence a outro corretor
          const corretores = await repository.findAll(session.imobiliaria_id);
          const conflict = corretores.find(c => 
            c.id !== id && 
            (c.telefone?.replace(/\D/g, '') === connectedNumber || c.whatsapp_number === connectedNumber)
          );

          if (conflict) {
            console.warn(`🛑 CONFLITO WHATSAPP: O número ${connectedNumber} já pertence ao corretor ${conflict.nome}`);
            
            // 3. Expulsar a conexão intrusa (Logout na Evolution)
            await fetch(`${process.env.EVOLUTION_URL}/instance/logout/${currentBroker.whatsapp_instance}`, {
              method: 'POST',
              headers: { 'apikey': process.env.EVOLUTION_API_KEY! }
            });

            return NextResponse.json({ 
              error: `Este número WhatsApp já está sendo usado pelo corretor ${conflict.nome}. A conexão foi encerrada para segurança.` 
            }, { status: 400 });
          }

          // Se não há conflito, anexa o número conectado ao body para salvar no banco
          body.whatsapp_number = connectedNumber;
        }
      }
    }

    const updated = await repository.update(id, session.imobiliaria_id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('❌ Erro no PATCH Corretor:', err);
    return NextResponse.json({ error: err.message || 'Erro interno ao processar atualização' }, { status: 500 });
  }
}
