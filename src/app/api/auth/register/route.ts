import { NextResponse } from 'next/server';
import { createImobiliaria, createUsuario, createLead, createImovel, createEvento, isMockMode } from '@/lib/mockDb';
import type { Moeda } from '@/lib/database.types';

export async function POST(request: Request) {
  try {
    const { nomeFantasia, email, pswd, configPais } = await request.json();

    if (!nomeFantasia || !email || !pswd) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    // In a real generic app, we check if email is unique globally.
    // For MVP using mock, we will proceed.
    if (isMockMode()) {
      // 1. Create Imobiliaria
      const novaImob = createImobiliaria({
        nome_fantasia: nomeFantasia,
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

      // 3. Optional: Inject 3 Demonstration Leads
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
          corretor_id: null, // Leaves as Orphan so they can test Assigning!
          status: 'novo',
        });
      });

      // 4. Inject Demonstration Imovel
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

      // 5. Inject Demonstration Event
      const dt = new Date();
      dt.setDate(dt.getDate() + 2);
      dt.setHours(14, 30, 0, 0);
      
      const leadDemoId = demoLeads[0]?.id || novaImob.id.slice(0,8); 
      
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

      // Success
      return NextResponse.json({ 
        success: true, 
        message: 'Conta criada com sucesso',
        user_id: user.id,
        imobiliaria_id: novaImob.id
      });
    } else {
      // Future Supabase logic
      return NextResponse.json({ error: 'Registro Cloud não configurado na V1.' }, { status: 501 });
    }

  } catch (err) {
    return NextResponse.json({ error: 'Erro interno ao criar conta' }, { status: 500 });
  }
}
