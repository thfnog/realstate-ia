import { NextResponse } from 'next/server';
import { getAuthFromCookies } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('planos')
    .select('*')
    .order('preco_mensal', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await getAuthFromCookies();
  if (!session || session.app_role !== 'master' && session.email !== 'admin@imobia.com') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from('planos')
    .insert([body])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
