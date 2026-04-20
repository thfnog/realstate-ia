import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function processFollowUpIntelligence(
  text: string, 
  corretor_id: string, 
  imobiliaria_id: string
): Promise<string | null> {
  console.log('🤖 Analisando intenção de follow-up / agendamento...');

  if (!GROQ_API_KEY) return null;

  // 1. Identificar intenção e disponibilidade mencionada
  const intentPrompt = `
Você é o assistente de agendamento da ImobIA. Sua tarefa é analisar a mensagem de um cliente e identificar se ele quer agendar uma visita ou reunião.

MENSAGEM: "${text}"

REGRAS:
1. Se o cliente falar sobre "visitar", "conhecer", "ver o imóvel", "marcar um horário", "reunião", etc., identifique como INTENÇÃO DE AGENDAMENTO.
2. Identifique se ele sugeriu algum dia ou período (ex: "sexta à tarde", "amanhã", "dia 25").
3. Retorne um JSON: { "scheduling_intent": boolean, "suggested_time_raw": string | null }
`;

  try {
    const resIntent = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: intentPrompt }],
        response_format: { type: 'json_object' }
      })
    });

    if (!resIntent.ok) return null;
    const { choices } = await resIntent.json();
    const result = JSON.parse(choices[0].message.content);

    if (!result.scheduling_intent) {
      console.log('ℹ️ Sem intenção de agendamento detectada.');
      return null;
    }

    console.log('📅 Intenção de agendamento detectada. Buscando agenda do corretor...');

    // 2. Buscar agenda do corretor (Próximos 7 dias)
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    let eventos: any[] = [];
    if (mock.isMockMode()) {
      eventos = mock.getEventos().filter(v => v.corretor_id === corretor_id);
    } else {
      const { data } = await supabaseAdmin
        .from('eventos')
        .select('data_hora, titulo')
        .eq('corretor_id', corretor_id)
        .gte('data_hora', now.toISOString())
        .lte('data_hora', nextWeek.toISOString());
      eventos = data || [];
    }

    // 3. Buscar configurações de horário da imobiliária (ou usar padrão)
    let workStart = '09:00';
    let workEnd = '18:00';

    if (!mock.isMockMode()) {
       const { data: imob } = await supabaseAdmin.from('imobiliarias').select('horario_inicio, horario_fim').eq('id', imobiliaria_id).single();
       if (imob?.horario_inicio) workStart = imob.horario_inicio;
       if (imob?.horario_fim) workEnd = imob.horario_fim;
    }

    const busySlots = eventos.map(e => `${new Date(e.data_hora).toLocaleString('pt-BR')}: ${e.titulo}`).join('\n');

    // 4. Gerar resposta com 3 sugestões
    const schedulerPrompt = `
Você é o bot da ImobIA. O cliente quer agendar. 
O corretor responsável está OCUPADO nestes horários:
${busySlots || 'Nenhum compromisso marcado.'}

HORÁRIO DE TRABALHO: ${workStart} às ${workEnd}.
PREFERÊNCIA DO CLIENTE: ${result.suggested_time_raw || 'Não mencionou preferência'}

TAREFA:
Sugerir exatamente 3 janelas de horários livres (1 hora cada) que façam sentido.
Seja muito educado e proativo. Use português do Brasil.

EXEMPLO DE RESPOSTA:
"Perfeito! Vou verificar a agenda aqui... 
Para o corretor X, temos estes horários disponíveis que podem funcionar para você:
1. Quinta-feira (22/04) às 10:00
2. Quinta-feira (22/04) às 15:30
3. Sexta-feira (23/04) às 09:00

Qual desses fica melhor para você?"

Retorne APENAS o texto da mensagem final.
`;

    const resFinal = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile', // Melhor para linguagem natural
        messages: [{ role: 'user', content: schedulerPrompt }]
      })
    });

    if (!resFinal.ok) return null;
    const dataFinal = await resFinal.json();
    return dataFinal.choices[0].message.content;

  } catch (err) {
    console.error('❌ Erro no AI Scheduler:', err);
    return null;
  }
}
