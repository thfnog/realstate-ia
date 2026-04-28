import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { Moeda } from '@/lib/database.types';

export async function POST(request: Request) {
  try {
    const { 
      nomeFantasia, 
      identificadorFiscal, 
      numeroRegistro, 
      email, 
      pswd, 
      configPais,
      planoId,
      cartao_final,
      cartao_bandeira
    } = await request.json();

    if (!nomeFantasia || !identificadorFiscal || !numeroRegistro || !email || !pswd || !planoId) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    // 1. Create Imobiliaria
    const { data: imob, error: imobError } = await supabaseAdmin
      .from('imobiliarias')
      .insert({
        nome_fantasia: nomeFantasia,
        identificador_fiscal: identificadorFiscal,
        numero_registro: numeroRegistro,
        config_pais: configPais === 'PT' ? 'PT' : 'BR',
        cartao_final,
        cartao_bandeira,
        delay_auto_reply_sec: 20,
        config_lembrete_1_horas: 24,
        config_lembrete_2_horas: 48,
      })
      .select()
      .single();

    if (imobError) {
      if (imobError.code === '23505') {
        return NextResponse.json({ error: 'Esta imobiliária ou número de registro já está cadastrado.' }, { status: 409 });
      }
      return NextResponse.json({ error: imobError.message }, { status: 500 });
    }

    // 2. Create Subscription
    const { error: subError } = await supabaseAdmin
      .from('assinaturas')
      .insert({
        tenant_id: imob.id,
        plano_id: planoId,
        status: 'ativo',
        periodo_inicio: new Date().toISOString(),
      });

    if (subError) {
      await supabaseAdmin.from('imobiliarias').delete().eq('id', imob.id);
      return NextResponse.json({ error: 'Erro ao vincular plano.' }, { status: 500 });
    }

    // 3. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: pswd,
      email_confirm: true,
      user_metadata: { imobiliaria_id: imob.id, role: 'admin' }
    });

    if (authError) {
      await supabaseAdmin.from('imobiliarias').delete().eq('id', imob.id);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // 4. Create Public User Record
    const { error: userError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authData.user.id,
        imobiliaria_id: imob.id,
        email: email,
        app_role: 'admin',
        status: 'ativo'
      });

    if (userError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('imobiliarias').delete().eq('id', imob.id);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // 5. Inject Demo Data (Optional but recommended for onboarding)
    const moeda: Moeda = configPais === 'PT' ? 'EUR' : 'BRL';
    
    // Create a demo Lead
    await supabaseAdmin.from('leads').insert({
      imobiliaria_id: imob.id,
      nome: 'João Silva (Demo)',
      telefone: configPais === 'PT' ? '+351910000000' : '+5511990000000',
      origem: 'manual',
      portal_origem: 'Demonstração',
      moeda,
      finalidade: 'comprar',
      descricao_interesse: 'Lead injetado automaticamente para efeitos de demonstração.',
      status: 'novo'
    });

    // Create a demo Property
    await supabaseAdmin.from('imoveis').insert({
      imobiliaria_id: imob.id,
      tipo: 'apartamento',
      freguesia: configPais === 'PT' ? 'Chiado (Demo)' : 'Pinheiros (Demo)',
      valor: configPais === 'PT' ? 450000 : 850000,
      quartos: 2,
      status: 'disponivel',
      moeda
    });

    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso',
      user_id: authData.user.id,
      imobiliaria_id: imob.id
    });

  } catch (err) {
    console.error('Erro ao registrar:', err);
    return NextResponse.json({ error: 'Erro interno ao criar conta' }, { status: 500 });
  }
}
