/**
 * API Copilot de Mensagens de IA — Real Estate Copilot
 * POST /api/ai/copilot-reply
 * Body: { lead_id: string, action_type: string, custom_instructions?: string }
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { callAIWithFallback, parseSafeJSON } from '@/lib/engine/aiUtils';
import * as mock from '@/lib/mockDb';
import { recommendImoveis } from '@/lib/engine/recommendImoveis';

export type CopilotActionType = 
  | 'proposta'
  | 'follow_up_visita'
  | 'quebra_objecao'
  | 'convidar_visita'
  | 'custom';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lead_id, action_type = 'convidar_visita', custom_instructions } = body;

    if (!lead_id) {
      return NextResponse.json({ error: 'lead_id é obrigatório' }, { status: 400 });
    }

    let lead: any = null;
    let broker: any = null;
    let messageHistory: any[] = [];
    let propertyContext: any = null;

    // 1. Carregar Lead e Histórico
    if (mock.isMockMode()) {
      lead = mock.getLeads().find(l => l.id === lead_id);
      if (lead && lead.corretor_id) {
        broker = mock.getCorretorById(lead.corretor_id);
      }
      messageHistory = mock.getMessagesByLead(lead_id);
    } else {
      const { data: leadData, error: leadError } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', lead_id)
        .maybeSingle();

      if (leadError || !leadData) {
        return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
      }

      lead = leadData;

      if (lead.corretor_id) {
        const { data: brokerData } = await supabaseAdmin
          .from('corretores')
          .select('id, nome, telefone')
          .eq('id', lead.corretor_id)
          .maybeSingle();
        broker = brokerData;
      }

      const { data: msgs } = await supabaseAdmin
        .from('mensagens_historico')
        .select('direction, message_text, criado_em, media_type')
        .eq('lead_id', lead_id)
        .order('criado_em', { ascending: true })
        .limit(12);

      messageHistory = msgs || [];
    }

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    // 2. Buscar dados de imóveis relevantes para contexto
    try {
      const matchingImoveis = await recommendImoveis(lead);
      if (matchingImoveis && matchingImoveis.length > 0) {
        propertyContext = matchingImoveis.slice(0, 2).map((im: any) => ({
          titulo: im.titulo,
          valor: im.valor,
          freguesia: im.freguesia || im.bairro,
          quartos: im.quartos,
          vagas: im.vagas_garagem,
          area: im.area_util
        }));
      }
    } catch (e) {
      console.warn('Não foi possível obter recomendações para o copilot:', e);
    }

    // 3. Formatar histórico para prompt
    const formattedHistory = messageHistory.map(m => {
      const sender = m.direction === 'inbound' ? lead.nome : (broker?.nome || 'Corretor');
      return `${sender}: ${m.message_text || '[Mídia / Áudio]'}`;
    }).join('\n');

    // 4. Configurar Diretriz por Tipo de Ação
    const actionPrompts: Record<CopilotActionType, string> = {
      proposta: `
O corretor deseja enviar uma proposta formal ou convite para fechamento/negociação (compra ou locação).
Crie 3 opções de mensagens persuasivas:
- Opção 1: Direta e consultiva, destacando condições comerciais facilitadas e oportunidade de valorização.
- Opção 2: Estratégica, criando escassez moderada (outros interessados na região) e sugerindo redigir a minuta de proposta.
- Opção 3: Cordial e segura, focada em esclarecer detalhes de pagamento/financiamento e alinhar oferta ao proprietário.`,

      follow_up_visita: `
O corretor acabou de realizar uma visita a um imóvel com o cliente ou o cliente visitou recentemente.
Crie 3 opções de mensagens de follow-up pós-visita:
- Opção 1: Entusiasta e consultiva, perguntando o que a família mais gostou e se o imóvel atendeu às expectativas.
- Opção 2: Focada em comparação com outros imóveis do mesmo bairro e passos seguintes.
- Opção 3: Objetiva para tirar dúvidas sobre condomínio, documentação ou ajustar proposta.`,

      quebra_objecao: `
O cliente expressou alguma hesitação ou objeção sobre preço, taxa de condomínio, localização ou momento do mercado.
Crie 3 opções de mensagens para quebra de objeção elegante:
- Opção 1: Ancoragem de valor de mercado por m² e potencial de valorização na região.
- Opção 2: Flexibilidade de negociação com o proprietário (estudo de contraproposta ou fluxo de pagamento).
- Opção 3: Alternativa consultiva oferecendo imóvel comparável ou simulação de financiamento mais vantajosa.`,

      convidar_visita: `
O corretor quer convidar o lead para conhecer pessoalmente o imóvel ou tomar um café no escritório/imobiliária.
Crie 3 opções de mensagens de convite:
- Opção 1: Convidativa e prática, sugerindo 2 opções de horários nesta semana (ex: quinta à tarde ou sábado de manhã).
- Opção 2: Focada na experiência sensorial (ver a iluminação natural, vista, acabamentos e infraestrutura do condomínio).
- Opção 3: Informal e acolhedora, convidando para um café rápido sem compromisso para tirar dúvidas.`,

      custom: `
Instrução personalizada do corretor: ${custom_instructions || 'Criar mensagem de contato com o cliente.'}
Crie 3 opções variando tom (mais direto, mais caloroso, mais consultivo).`
    };

    const specificActionInstruction = actionPrompts[action_type as CopilotActionType] || actionPrompts.convidar_visita;

    const systemPrompt = `Você é o Copilot de IA do ImobIA, um especialista em vendas e negociações imobiliárias no Brasil.
Seu trabalho é sugerir 3 variações de mensagens de alta conversão prontas para envio no WhatsApp pelo corretor ${broker?.nome || 'Consultor'}.

Diretrizes de Estilo:
- Padrão WhatsApp Brasil: linguagem humana, calorosa, profissional, objetiva.
- Use emojis com moderação inteligente (1 a 3 por mensagem) para criar conexão visual.
- Sempre inclua um Call to Action (CTA) claro no final da mensagem (uma pergunta aberta ou convite a responder).
- Não use linguagem excessivamente engessada ou corporativa de e-mail. Pareça uma conversa real e personalizada.
- Adapte-se ao nome do cliente (${lead.nome}) e aos detalhes que ele procura.

Retorne ESTRITAMENTE um objeto JSON no formato:
{
  "suggestions": [
    "Primeira opção de mensagem completa...",
    "Segunda opção de mensagem completa...",
    "Terceira opção de mensagem completa..."
  ]
}`;

    const userPrompt = `
PERFIL DO CLIENTE:
- Nome: ${lead.nome}
- Telefone: ${lead.telefone}
- Finalidade: ${lead.finalidade || 'Comprar / Alugar'}
- Tipo de interesse: ${lead.tipo_interesse || 'Não especificado'}
- Orçamento: ${lead.orcamento ? `R$ ${lead.orcamento.toLocaleString('pt-BR')}` : 'Não informado'}
- Bairros: ${lead.bairros_interesse?.join(', ') || 'Geral'}
- Quartos: ${lead.quartos_interesse || 'Não especificado'}
- Descrição de interesse: ${lead.descricao_interesse || 'Geral'}

IMÓVEIS EM DESTAQUE NO PERFIL:
${propertyContext ? JSON.stringify(propertyContext, null, 2) : 'Nenhum imóvel específico vinculado no momento'}

HISTÓRICO RECENTE DE CONVERSAS:
${formattedHistory || 'Nenhuma conversa recente registrada'}

OBJETIVO DO CORRETOR:
${specificActionInstruction}

Gere exatamente 3 sugestões persuasivas e diferentes para o corretor enviar.
`;

    const aiResponse = await callAIWithFallback({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      imobiliaria_id: lead.imobiliaria_id,
      feature: `copilot_${action_type}`
    });

    let suggestions: string[] = [];
    try {
      const content = aiResponse.choices?.[0]?.message?.content;
      if (content) {
        const parsed = parseSafeJSON(content);
        if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
          suggestions = parsed.suggestions.map((s: any) => String(s).trim());
        }
      }
    } catch (parseError) {
      console.error('Erro ao parsear retorno do Copilot IA:', parseError);
    }

    // Fallbacks inteligentes se a IA falhar ou retornar menos de 3 sugestões
    if (suggestions.length < 3) {
      const fallbackMap: Record<string, string[]> = {
        proposta: [
          `Olá, ${lead.nome}! Tudo bem? 🤝 Analisei com carinho o imóvel que você gostou. O proprietário está aberto a avaliar uma proposta formal essa semana. O que acha de formatarmos uma oferta de ${lead.orcamento ? `R$ ${Number(lead.orcamento).toLocaleString('pt-BR')}` : 'valor'} para avançarmos com segurança?`,
          `Oi ${lead.nome}! 🏠 Sobre o imóvel que conversamos, temos uma excelente margem para estruturar a compra/locação com condições facilitadas. Consegue me confirmar se prefere pagamento à vista ou simular financiamento para enviarmos a proposta?`,
          `Olá ${lead.nome}, como você está? ✨ A procura por opções nessa região está alta, mas reservei a prioridade de negociação para você. Vamos estruturar sua proposta hoje para garantir o imóvel?`
        ],
        follow_up_visita: [
          `Olá, ${lead.nome}! Tudo bem? 😊 Passando para saber o que você achou da nossa visita ao imóvel! Aquele espaço atendeu ao que você e sua família estavam buscando?`,
          `Oi ${lead.nome}! 🌟 Fiquei pensando na visita de hoje... Aquele living integrado e a localização têm tudo a ver com o que você me descreveu. Ficou alguma dúvida sobre os detalhes ou condomínio que eu possa esclarecer?`,
          `Olá ${lead.nome}! 🏠 Como foi a conversa em casa sobre o imóvel que visitamos? Se quiser, posso preparar uma simulação de fluxo de pagamento para te ajudar na decisão!`
        ],
        quebra_objecao: [
          `Olá, ${lead.nome}! Compreendo perfeitamente sua consideração sobre o valor. 💡 Vale lembrar que a região vem valorizando cerca de 12% ao ano e o m² está muito competitivo. Além disso, o proprietário está flexível para contraproposta. O que seria um valor confortável para você?`,
          `Oi ${lead.nome}! Entendo sua cautela. Negociação boa é aquela em que ambas as partes saem satisfeitas. Se conseguirmos uma condição especial no fluxo de entrada, esse imóvel continuaria no seu radar?`,
          `Olá ${lead.nome}! 🤝 Além dessa opção, selecionei mais 2 imóveis com taxa condominial mais enxuta no mesmo padrão que você busca. Gostaria que eu te enviasse para comparar?`
        ],
        convidar_visita: [
          `Olá, ${lead.nome}! Tudo bem? 🏠 Separei um imóvel espetacular que encaixa exatamente nas suas preferências. Você teria disponibilidade para fazermos uma visita rápida nesta quinta às 15h ou sábado pela manhã?`,
          `Oi ${lead.nome}! ✨ As fotos não fazem justiça ao acabamento e à iluminação natural desse imóvel. Que tal darmos um pulo lá para você conhecer pessoalmente? Qual melhor horário para você?`,
          `Olá ${lead.nome}! Que tal tomarmos um café aqui na nossa imobiliária para eu te apresentar as melhores oportunidades da região e já aproveitarmos para visitar as melhores opções?`
        ]
      };

      const defaults = fallbackMap[action_type] || fallbackMap.convidar_visita;
      while (suggestions.length < 3) {
        suggestions.push(defaults[suggestions.length] || defaults[0]);
      }
    }

    return NextResponse.json({
      success: true,
      action_type,
      lead_id,
      suggestions: suggestions.slice(0, 3)
    });

  } catch (error: any) {
    console.error('❌ Erro no Copilot de Mensagens:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no Copilot' }, { status: 500 });
  }
}
