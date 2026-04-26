import { NextRequest, NextResponse } from 'next/server';
import { getUserSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getAuthFromCookies } from '@/lib/auth';
import { getContratoRepository } from '@/lib/repositories/factory';
import { processTemplate, DEFAULT_VENDA_TEMPLATE } from '@/lib/utils/documentGenerator';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getAuthFromCookies();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || '';
    const client = getUserSupabaseClient(token);
    const repo = getContratoRepository(client);
    
    const contrato = await repo.findById(id);

    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    const template = DEFAULT_VENDA_TEMPLATE;
    const content = processTemplate(template, contrato);

    return new Response(content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="contrato-${contrato.id}.md"`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
