import { NextResponse } from 'next/server';
import { createImobiliaria, createUsuario, createLead, createImovel, createEvento, isMockMode } from '@/lib/mockDb';
import type { Moeda } from '@/lib/database.types';

export async function POST(request: Request) {
  try {
    const { nomeFantasia, identificadorFiscal, numeroRegistro, email, pswd, configPais } = await request.json();

    if (!nomeFantasia || !identificadorFiscal || !numeroRegistro || !email || !pswd) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    // In a real generic app, we check if email is unique globally.
    // For MVP using mock, we will proceed.
    if (isMockMode()) {
      try {
        // 1. Create Imobiliaria
        const novaImob = createImobiliaria({
          nome_fantasia: nomeFantasia,
          identificador_fiscal: identificadorFiscal,
          numero_registro: numeroRegistro,
          plano: 'free',
          config_pais: configPais === 'PT' ? 'PT' : 'BR',
        });

        // 2. Create Usuario
        const user = createUsuario({
          imobiliaria_id: novaImob.id,
          email: email,
          hash_senha: pswd, // Note: Always hash in production
          role: 'admin',
          corretor_id: null,
        });

        // ... (demo data injection follows)
        const moeda: Moeda = configPais === 'PT' ? 'EUR' : 'BRL';
        const demoNames = ['João Silva (Demo)', 'Maria Fernandes (Demo)', 'Ricardo Costa (Demo)'];
        const demoLeads = demoNames.map((n) => {
          return createLead({
            imobiliaria_id: novaImob.id,
            nome: n,
            telefone: configPais === 'PT' ? '+351910000000' : '+5511990000000',
            origem: 'manual',
            portal_origem: 'Demonstração',
            moeda,
            finalidade: 'comprar',
            prazo: 'Imediato',
            pagamento: null,
            descricao_interesse: 'Lead injetado de forma automática para efeitos de demonstração.',
            tipo_interesse: 'apartamento',
            orcamento: configPais === 'PT' ? 250000 : 500000,
            area_interesse: null,
            quartos_interesse: 2,
            vagas_interesse: null,
            bairros_interesse: [],
            corretor_id: null,
            status: 'novo',
          });
        });

        const imovel = createImovel({
          imobiliaria_id: novaImob.id,
          tipo: 'apartamento',
          bairro: configPais === 'PT' ? 'Chiado (Demonstração)' : 'Pinheiros (Demonstração)',
          valor: configPais === 'PT' ? 450000 : 850000,
          area_m2: 85,
          quartos: 2,
          vagas: 1,
          status: 'disponivel',
          moeda,
        });

        const dt = new Date();
        dt.setDate(dt.getDate() + 2);
        dt.setHours(14, 30, 0, 0);
        const leadDemoId = demoLeads[0]?.id || novaImob.id.slice(0, 8);
        createEvento({
          imobiliaria_id: novaImob.id,
          lead_id: leadDemoId,
          tipo: 'reuniao',
          titulo: 'Reunião de Alinhamento (Demo)',
          descricao: 'Evento inserido automaticamente para demonstração da agenda.',
          data_hora: dt.toISOString(),
          local: 'Escritório',
          status: 'agendado',
        });

        return NextResponse.json({
          success: true,
          message: 'Conta criada com sucesso',
          user_id: user.id,
          imobiliaria_id: novaImob.id
        });
      } catch (err: any) {
        if (err.message === 'DUPLICATE_IDENTIFIER') {
          return NextResponse.json({ error: 'Esta imobiliária (CNPJ/NIF) já está cadastrada no ImobIA.' }, { status: 409 });
        }
        if (err.message === 'DUPLICATE_REGISTRATION') {
          return NextResponse.json({ error: 'Este número de registro (CRECI/AMI) já está cadastrado.' }, { status: 409 });
        }
        throw err;
      }
    } else {
      // Future Supabase logic
      return NextResponse.json({ error: 'Registro Cloud não configurado na V1.' }, { status: 501 });
    }
  } catch (err) {
    console.error('Erro ao registrar:', err);
    return NextResponse.json({ error: 'Erro interno ao criar conta' }, { status: 500 });
  }
}
