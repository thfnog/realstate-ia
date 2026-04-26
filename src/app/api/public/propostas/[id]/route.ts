import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('propostas_aluguel')
      .select(`
        *,
        imovel:imoveis (
          referencia,
          titulo,
          endereco,
          bairro,
          cidade,
          fotos
        ),
        documentos:propostas_documentos (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });

    // Remove sensitive fields if necessary, but here we need basic info for the tenant
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
