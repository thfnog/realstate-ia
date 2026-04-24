import { NextResponse } from 'next/server';
import { getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getLeadRepository } from '@/lib/repositories/factory';
import { getAuthFromCookies } from '@/lib/auth';
import type { StatusLead } from '@/lib/database.types';

// GET: Get lead details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getLeadRepository(client);

    const lead = await repository.findById(id, session.imobiliaria_id);

    if (!lead) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (err) {
    console.error('SERVER ERROR GET LEAD:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PATCH: Update lead status
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
    const repository = getLeadRepository(client);

    const updateData: Record<string, any> = {};
    if (body.status) updateData.status = body.status;
    if (body.corretor_id !== undefined) updateData.corretor_id = body.corretor_id;

    let updatedLead;

    if (Object.keys(updateData).length > 0) {
      updatedLead = await repository.update(id, session.imobiliaria_id, updateData);
    } else {
      updatedLead = await repository.findById(id, session.imobiliaria_id);
    }

    if (!updatedLead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    // 🚀 Handle Resend Briefing (Engine logic)
    if (body.resend_briefing) {
       const { processLead } = await import('@/lib/engine/processLead');
       await processLead(updatedLead as any, { forceAutoReply: body.resend_briefing });
    }

    return NextResponse.json(updatedLead);
  } catch (err: any) {
    console.error('Erro ao atualizar lead:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repository = getLeadRepository(client);

    await repository.delete(id, session.imobiliaria_id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Erro ao deletar lead:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
