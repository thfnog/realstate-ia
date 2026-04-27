import { NextResponse } from 'next/server';
import { getAuthFromCookies } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('notificacoes')
    .select('*')
    .eq('usuario_id', session.usuario_id)
    .order('criado_em', { ascending: false })
    .limit(50);

  if (error) {
    console.error('API Notificações GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const session = await getAuthFromCookies();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { id, all } = await request.json();

    if (all) {
      const { error } = await supabaseAdmin
        .from('notificacoes')
        .update({ lida: true })
        .eq('usuario_id', session.usuario_id)
        .eq('lida', false);
      
      if (error) throw error;
    } else if (id) {
      const { error } = await supabaseAdmin
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id)
        .eq('usuario_id', session.usuario_id);
      
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API Notificações PATCH error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
