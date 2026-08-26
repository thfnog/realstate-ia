import { NextResponse } from 'next/server';
import { AgenticEngine } from '@/lib/engine/agenticEngine';
import { JITRetriever } from '@/lib/knowledge/jitRetriever';
import { HITLManager } from '@/lib/engine/hitlManager';
import { LeadMemoryCompressor } from '@/lib/engine/leadMemoryCompressor';
import * as mock from '@/lib/mockDb';
import { supabaseAdmin } from '@/lib/supabase';
import type { Lead } from '@/lib/database.types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, message, leadData, history = [], brokerName = 'Rodrigo Ramos', brokerPhone = '11988887777', hitlCommand } = body;

    // 1. Handle HITL Broker Command simulation
    if (action === 'hitl_command' && hitlCommand) {
      const hitlRes = await HITLManager.checkAndProcessBrokerReply(brokerPhone, hitlCommand, 'BR');
      return NextResponse.json({
        type: 'hitl_result',
        handled: hitlRes.handled,
        actionTaken: hitlRes.handled ? 'processed' : 'unrecognized',
        message: hitlRes.message
      });
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    const startTime = Date.now();
    const imobiliariaId = mock.DEFAULT_IMOBILIARIA_ID;

    // 2. Prepare Lead context
    const lead: Lead = {
      id: leadData?.id || 'lead-simulador-1',
      imobiliaria_id: imobiliariaId,
      nome: leadData?.nome || 'Fernanda Lima',
      telefone: leadData?.telefone || '11999887766',
      email: leadData?.email || 'fernanda@gmail.com',
      origem: 'whatsapp',
      portal_origem: 'WhatsApp Simulador',
      moeda: leadData?.moeda || 'BRL',
      finalidade: leadData?.finalidade || 'comprar',
      tipo_interesse: leadData?.tipo_interesse || 'apartamento',
      orcamento: leadData?.orcamento || 800000,
      quartos_interesse: leadData?.quartos_interesse ?? 2,
      bairros_interesse: leadData?.bairros_interesse || ['Pinheiros'],
      vagas_interesse: leadData?.vagas_interesse ?? 1,
      area_interesse: null,
      prazo: '3 meses',
      pagamento: 'financiamento',
      descricao_interesse: leadData?.descricao_interesse || 'Interessada em apartamento',
      corretor_id: 'corretor-1',
      imovel_id: leadData?.imovel_id || null,
      status: leadData?.status || 'novo',
      classificacao: leadData?.classificacao || 'comprador',
      criado_em: new Date().toISOString()
    };

    // 3. JIT Context Analysis
    const jitResult = await JITRetriever.retrieveJITContext({
      userText: message,
      imobiliariaId,
      targetPropertyId: lead.imovel_id
    });

    // 4. Process with Agentic Engine (ReAct loop + tools)
    const result = await AgenticEngine.processMessage(
      message,
      lead,
      imobiliariaId,
      history,
      brokerName,
      'corretor-1'
    );

    const latencyMs = Date.now() - startTime;

    // 5. Memory snapshot
    const memorySnapshot = history.length >= 3 
      ? LeadMemoryCompressor.getCachedMemory(lead.id) || 'Síntese em construção' 
      : 'Conversa inicial';

    return NextResponse.json({
      success: true,
      reply: result.reply,
      newState: result.newState,
      actions: result.actions,
      toolsExecuted: result.toolsExecuted,
      jitEntities: jitResult.entitiesDetected,
      jitSnippet: jitResult.retrievedSnippet,
      tokensEstimated: jitResult.tokensEstimated + 350,
      memorySnapshot,
      latencyMs
    });

  } catch (err: any) {
    console.error('❌ Erro no simulador:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || 'Erro ao processar simulação' 
    }, { status: 500 });
  }
}
