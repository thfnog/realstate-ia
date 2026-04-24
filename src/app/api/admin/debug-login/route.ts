import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isMockMode } from '@/lib/mockDb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Forneça o ?email= na URL' }, { status: 400 });
  }

  try {
    const isMock = isMockMode();
    const isServiceKey = process.env.SUPABASE_SERVICE_KEY ? 'Configurada (tamanho: ' + process.env.SUPABASE_SERVICE_KEY.length + ')' : 'Faltando';
    const isJwtSecret = process.env.SUPABASE_JWT_SECRET ? 'Configurada' : 'Faltando';

    // Test DB connection and RLS bypass
    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, role')
      .eq('email', email)
      .maybeSingle();

    return NextResponse.json({
      environment: {
        isMockMode: isMock,
        hasServiceKey: isServiceKey,
        hasJwtSecret: isJwtSecret,
        NODE_ENV: process.env.NODE_ENV,
      },
      dbTest: {
        success: !error && !!data,
        error: error ? error.message : null,
        userFound: !!data,
        userData: data || null,
        diagnosis: error 
          ? 'Erro de banco (Pode ser RLS bloqueando se a Service Key for inválida ou for a chave Anon)'
          : (!data ? 'Usuário não encontrado no banco' : 'Usuário encontrado com sucesso. O RLS foi ignorado pela Service Key corretamente.'),
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Erro fatal', details: err.message }, { status: 500 });
  }
}
