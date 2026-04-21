import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import { fetchInstanceOwner } from '@/lib/whatsapp';

// PUT: Update a broker
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (mock.isMockMode()) {
      const updated = mock.updateCorretor(id, {
        nome: body.nome,
        telefone: body.telefone,
        email: body.email || null,
        ativo: body.ativo ?? true,
      });
      if (!updated) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      return NextResponse.json(updated);
    }

    const { data, error } = await supabaseAdmin
      .from('corretores')
      .update({
        nome: body.nome,
        telefone: body.telefone,
        email: body.email || null,
        ativo: body.ativo ?? true,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE: Delete a broker
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (mock.isMockMode()) {
      mock.deleteCorretor(id);
      return NextResponse.json({ success: true });
    }

    const { error } = await supabaseAdmin
      .from('corretores')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PATCH: Partial update (e.g., whatsapp_status)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // --- LÓGICA DE SEGURANÇA WHATSAPP (STRICT 1:1) ---
    if (body.whatsapp_status === 'open') {
      let currentBroker;
      if (mock.isMockMode()) {
        currentBroker = mock.getCorretorById(id);
      } else {
        const { data } = await supabaseAdmin.from('corretores').select('*').eq('id', id).single();
        currentBroker = data;
      }

      if (currentBroker && currentBroker.whatsapp_instance) {
        // 1. Descobrir qual número realmente conectou
        const ownerJid = await fetchInstanceOwner(currentBroker.whatsapp_instance);
        const connectedNumber = ownerJid ? ownerJid.split('@')[0] : null;

        if (connectedNumber) {
          // 2. Verificar se esse número já pertence a outro corretor
          // (Seja pelo campo 'telefone' ou pelo 'whatsapp_number' de quem está 'open')
          let conflict;
          if (mock.isMockMode()) {
             // Mock check
             conflict = mock.getCorretores().find(c => 
               c.id !== id && 
               (c.telefone?.replace(/\D/g, '') === connectedNumber || c.whatsapp_number === connectedNumber)
             );
          } else {
             const { data } = await supabaseAdmin
               .from('corretores')
               .select('id, nome')
               .neq('id', id)
               .or(`telefone.ilike.%${connectedNumber}%,whatsapp_number.eq.${connectedNumber}`)
               .maybeSingle();
             conflict = data;
          }

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

    if (mock.isMockMode()) {
      const updated = mock.updateCorretor(id, body);
      if (!updated) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      return NextResponse.json(updated);
    }

    const { data, error } = await supabaseAdmin
      .from('corretores')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ Erro no PATCH Corretor:', error);
    return NextResponse.json({ error: 'Erro interno ao processar atualização' }, { status: 500 });
  }
}
