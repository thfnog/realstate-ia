/**
 * Real Estate Agentic Engine (ReAct Loop with Native Tool Calling)
 * Inspired by Enterprise Assistant AgenticExecutor
 * 
 * Replaces rigid FSM with autonomous tool calling, multi-layered ContextEngine,
 * and adaptive conversation flows.
 */

import { callAIWithFallback } from './aiUtils';
import { ContextEngine } from './contextEngine';
import { AgenticTools, ToolExecutionContext } from './agenticTools';
import { ModelRouter } from './modelRouter';
import { JITRetriever } from '@/lib/knowledge/jitRetriever';
import { supabaseAdmin } from '@/lib/supabase';
import type { Lead } from '@/lib/database.types';

export interface AgenticResult {
  reply: string | null;
  newState: string;
  actions: Array<{ type: string; data: any }>;
  shouldRespond: boolean;
  toolsExecuted: string[];
}

export class AgenticEngine {
  /**
   * Executes the full ReAct conversation loop with native tool calling
   */
  static async processMessage(
    userText: string,
    lead: Lead,
    imobiliariaId: string,
    history: any[] = [],
    brokerName?: string,
    brokerId?: string
  ): Promise<AgenticResult> {
    console.log(`🤖 [AgenticEngine] Iniciando loop ReAct para lead: ${lead.nome || lead.telefone}`);

    const route = ModelRouter.getRoute('agentic_chat');
    const tools = AgenticTools.getToolDefinitions();

    // 0. JIT Context Retrieval from Knowledge Graph
    const jitResult = await JITRetriever.retrieveJITContext({
      userText,
      imobiliariaId,
      targetPropertyId: lead.imovel_id
    });

    if (jitResult.entitiesDetected.length > 0) {
      console.log(`🧠 [AgenticEngine] JIT Entidades detectadas:`, jitResult.entitiesDetected.join(', '));
    }

    // 1. Build prioritized context with JIT snippet
    const builtContext = ContextEngine.buildContext({
      lead,
      brokerName: brokerName || 'Corretor',
      history,
      jitSnippet: jitResult.retrievedSnippet,
      maxHistoryTurns: 6
    });

    console.log(`📊 [AgenticEngine] Tokens estimados no contexto: ~${builtContext.totalTokensEstimated}`);

    // 2. Assemble ReAct messages
    const messages: any[] = [
      { role: 'system', content: builtContext.systemPrompt }
    ];

    // Append recent history
    const sortedHistory = [...history]
      .sort((a, b) => new Date(a.criado_em || 0).getTime() - new Date(b.criado_em || 0).getTime())
      .slice(-6);

    for (const h of sortedHistory) {
      messages.push({
        role: h.direction === 'inbound' ? 'user' : 'assistant',
        content: h.message_text
      });
    }

    // Add current user message
    messages.push({ role: 'user', content: userText });

    const maxIterations = 4;
    let iteration = 0;
    let finalAnswer = '';
    const extraMessages: string[] = [];
    const toolsExecuted: string[] = [];
    const actions: Array<{ type: string; data: any }> = [];

    const toolContext: ToolExecutionContext = {
      lead,
      imobiliariaId,
      brokerId: brokerId || lead.corretor_id || undefined,
      brokerName
    };

    while (iteration < maxIterations) {
      iteration++;

      let response: any;
      try {
        response = await callAIWithFallback({
          imobiliaria_id: imobiliariaId,
          feature: 'agentic_chat',
          model: route.primaryModel,
          temperature: route.temperature,
          messages,
          tools,
          tool_choice: 'auto'
        });
      } catch (err: any) {
        console.error(`❌ [AgenticEngine] Falha na chamada do modelo:`, err);
        return {
          reply: 'Olá! Tive uma pequena oscilação aqui na conexão. Pode repetir sua mensagem por favor?',
          newState: 'qualifying',
          actions: [],
          shouldRespond: true,
          toolsExecuted
        };
      }

      const choice = response.choices?.[0];
      const assistantMessage = choice?.message;

      if (!assistantMessage) {
        break;
      }

      // Check for tool calls
      const toolCalls = assistantMessage.tool_calls;

      if (!toolCalls || toolCalls.length === 0) {
        // No more tools called -> final answer reached
        finalAnswer = assistantMessage.content || '';
        break;
      }

      // Append assistant's tool calling intent to messages
      messages.push(assistantMessage);

      // Execute each tool call
      for (const tc of toolCalls) {
        const fnName = tc.function?.name;
        let fnArgs: any = {};
        try {
          fnArgs = typeof tc.function?.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function?.arguments || {};
        } catch {
          fnArgs = {};
        }

        toolsExecuted.push(fnName);
        console.log(`⚡ [AgenticEngine] Iteração ${iteration} -> Executando Tool: ${fnName}`);

        const execution = await AgenticTools.executeTool(fnName, fnArgs, toolContext);

        if (execution.extraMessage) {
          extraMessages.push(execution.extraMessage);
        }

        // Record actions
        if (fnName === 'book_visit') {
          actions.push({ type: 'create_event', data: execution.result });
        } else if (fnName === 'update_lead_profile') {
          actions.push({ type: 'update_lead', data: execution.result.updated });
        } else if (fnName === 'request_human_handoff') {
          actions.push({ type: 'handoff', data: execution.result });
        }

        // Provide tool response back to LLM for synthesis
        messages.push({
          role: 'tool',
          tool_call_id: tc.id || `call_${Date.now()}`,
          name: fnName,
          content: JSON.stringify(execution.result)
        });
      }
    }

    // Combine final spoken text with any formatted tool output (cards/slots)
    let combinedReply = finalAnswer.trim();
    if (extraMessages.length > 0) {
      combinedReply = combinedReply
        ? `${combinedReply}\n\n${extraMessages.join('\n\n')}`
        : extraMessages.join('\n\n');
    }

    // Determine state
    let newState = 'qualifying';
    if (toolsExecuted.includes('book_visit')) {
      newState = 'visit_confirmed';
    } else if (toolsExecuted.includes('check_available_slots')) {
      newState = 'scheduling';
    } else if (toolsExecuted.includes('search_properties')) {
      newState = 'recommending';
    } else if (toolsExecuted.includes('request_human_handoff')) {
      newState = 'human_handoff';
    }

    return {
      reply: combinedReply || null,
      newState,
      actions,
      shouldRespond: !!combinedReply,
      toolsExecuted
    };
  }
}
