import { supabaseAdmin } from '@/lib/supabase';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

export type AIModel = 
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'deepseek-chat'
  | 'deepseek-r1'
  | 'qwen-2.5-72b'
  | 'llama-3.3-70b-versatile'
  | 'llama-3.1-8b-instant'
  | 'llama-3.2-11b-vision-preview'
  | 'gpt-4o-mini'
  | 'gpt-4o';

export function parseSafeJSON(str: string): any {
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch (e) {
    const match = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {}
    }
    const firstBrace = str.indexOf('{');
    const lastBrace = str.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(str.substring(firstBrace, lastBrace + 1));
      } catch {}
    }
    const firstBracket = str.indexOf('[');
    const lastBracket = str.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(str.substring(firstBracket, lastBracket + 1));
      } catch {}
    }
    throw e;
  }
}

interface AICallOptions {
  model?: AIModel;
  messages: any[];
  temperature?: number;
  response_format?: { type: 'json_object' };
  tools?: Array<{ type: 'function'; function: { name: string; description: string; parameters: any } }>;
  tool_choice?: 'auto' | 'none' | any;
  imobiliaria_id?: string;
  feature?: string;
}

/**
 * Maps logical model names to OpenRouter model ids
 */
function resolveOpenRouterModel(model: AIModel): string {
  switch (model) {
    case 'gemini-2.5-flash': return 'google/gemini-2.5-flash';
    case 'gemini-2.5-pro': return 'google/gemini-2.5-pro';
    case 'deepseek-chat': return 'deepseek/deepseek-chat';
    case 'deepseek-r1': return 'deepseek/deepseek-r1';
    case 'qwen-2.5-72b': return 'qwen/qwen-2.5-72b-instruct';
    case 'llama-3.3-70b-versatile': return 'meta-llama/llama-3.3-70b-instruct';
    case 'llama-3.1-8b-instant': return 'meta-llama/llama-3.1-8b-instruct';
    case 'gpt-4o-mini': return 'openai/gpt-4o-mini';
    case 'gpt-4o': return 'openai/gpt-4o';
    default: return model;
  }
}

/**
 * Formats standard messages and tools for Google Generative AI REST API
 */
async function callGeminiDirect(options: AICallOptions, modelName: string, apiKey: string): Promise<any> {
  const geminiModel = modelName.includes('pro') ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  let systemInstructionText = '';
  const contents: any[] = [];

  for (const m of options.messages) {
    if (m.role === 'system') {
      systemInstructionText += (systemInstructionText ? '\n\n' : '') + m.content;
    } else if (m.role === 'tool') {
      contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: m.name || 'tool_response',
            response: { content: m.content }
          }
        }]
      });
    } else if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
      const parts: any[] = [];
      if (m.content) parts.push({ text: m.content });
      for (const tc of m.tool_calls) {
        let args = {};
        try {
          args = typeof tc.function?.arguments === 'string' ? JSON.parse(tc.function.arguments) : (tc.function?.arguments || {});
        } catch { /* empty */ }
        parts.push({
          functionCall: {
            name: tc.function?.name,
            args
          }
        });
      }
      contents.push({ role: 'model', parts });
    } else {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || '' }]
      });
    }
  }

  const payload: any = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.2
    }
  };

  if (systemInstructionText) {
    payload.systemInstruction = { parts: [{ text: systemInstructionText }] };
  }

  if (options.tools && options.tools.length > 0) {
    payload.tools = [{
      functionDeclarations: options.tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters
      }))
    }];
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`Gemini API Error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  let textContent = '';
  const tool_calls: any[] = [];

  for (const p of parts) {
    if (p.text) textContent += p.text;
    if (p.functionCall) {
      tool_calls.push({
        id: `call_gemini_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'function',
        function: {
          name: p.functionCall.name,
          arguments: JSON.stringify(p.functionCall.args || {})
        }
      });
    }
  }

  return {
    choices: [{
      message: {
        role: 'assistant',
        content: textContent || null,
        tool_calls: tool_calls.length > 0 ? tool_calls : undefined
      }
    }],
    usage: {
      prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount || 0
    }
  };
}

/**
 * Executes an AI call using dynamic multi-provider routing (Gemini -> OpenRouter -> Groq -> OpenAI)
 * ensuring zero downtime even if credit limits or rate limits are hit.
 */
export async function callAIWithFallback(options: AICallOptions): Promise<any> {
  const baseModel = options.model || 'gemini-2.5-flash';
  const attempts: { model: string; provider: 'gemini' | 'openrouter' | 'groq' | 'openai'; url: string; key: string }[] = [];

  const groqKey = process.env.GROQ_API_KEY || '';
  const openaiKey = process.env.OPENAI_API_KEY || '';
  const openrouterKey = process.env.OPENROUTER_API_KEY || '';
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

  // 1. Google Gemini Native (Prioridade se configurado)
  if (geminiKey && (baseModel.includes('gemini') || !openrouterKey)) {
    attempts.push({
      model: baseModel.includes('gemini') ? baseModel : 'gemini-2.5-flash',
      provider: 'gemini',
      url: '',
      key: geminiKey
    });
  }

  // 2. OpenRouter (Multi-modelos: Gemini, DeepSeek, Qwen, Llama)
  if (openrouterKey) {
     attempts.push({ 
       model: resolveOpenRouterModel(baseModel), 
       provider: 'openrouter', 
       url: OPENROUTER_URL, 
       key: openrouterKey 
     });
  }

  // 3. Groq (Rápido, fallback leve para Llama 70B / 8B)
  if (groqKey) {
     const groqModel = baseModel.includes('8b') ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile';
     attempts.push({ 
       model: groqModel, 
       provider: 'groq', 
       url: GROQ_URL, 
       key: groqKey 
     });
     if (groqModel !== 'llama-3.1-8b-instant') {
        attempts.push({ 
          model: 'llama-3.1-8b-instant', 
          provider: 'groq', 
          url: GROQ_URL, 
          key: groqKey 
        });
     }
  }

  // 4. OpenAI (O Estepe Infalível de Produção)
  if (openaiKey) {
     attempts.push({ 
       model: 'gpt-4o-mini', 
       provider: 'openai', 
       url: OPENAI_URL, 
       key: openaiKey 
     });
  }

  let lastError = null;

  for (const target of attempts) {
    try {
      if (!target.key) continue;

      console.log(`🤖 Chamando IA via [${target.provider.toUpperCase()}] com modelo: ${target.model}...`);
      
      let data: any;

      if (target.provider === 'gemini') {
        data = await callGeminiDirect(options, target.model, target.key);
      } else {
        // OpenRouter exige um cabeçalho extra para identificar a requisição corretamente
        const headers: any = {
          'Authorization': `Bearer ${target.key}`,
          'Content-Type': 'application/json'
        };
        if (target.provider === 'openrouter') {
          headers['HTTP-Referer'] = 'https://realstate-ia.vercel.app';
          headers['X-Title'] = 'ImobIA Engine';
        }

        const bodyPayload: any = {
          model: target.model,
          messages: options.messages,
          temperature: options.temperature ?? 0,
        };

        if (options.tools && options.tools.length > 0) {
          bodyPayload.tools = options.tools;
          if (options.tool_choice) bodyPayload.tool_choice = options.tool_choice;
        } else if (options.response_format && target.provider !== 'openrouter') {
          bodyPayload.response_format = options.response_format;
        }

        const response = await fetch(target.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload)
        });

        if (response.status === 429) {
          console.warn(`⚠️ Rate limit atingido em [${target.provider}]. Tentando próximo fallback...`);
          lastError = `Rate limit (429) em ${target.provider}`;
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          console.error(`❌ Erro na API [${target.provider}] (${target.model}):`, response.status, errText);
          lastError = `Status ${response.status} (${target.provider}): ${errText}`;
          continue;
        }

        data = await response.json();
      }
      
      // Log Success
      if (options.imobiliaria_id) {
        await logAIUsage({
          imobiliaria_id: options.imobiliaria_id,
          model: target.model,
          feature: options.feature || 'unknown',
          status: 'success',
          input_tokens: data.usage?.prompt_tokens || 0,
          output_tokens: data.usage?.completion_tokens || 0,
          provider: target.provider
        });
      }

      return data;

    } catch (err: any) {
      console.error(`❌ Falha crítica no provedor [${target.provider}]:`, err.message);
      lastError = err.message;
    }
  }

  // If all models failed, log final error
  if (options.imobiliaria_id && attempts.length > 0) {
    await logAIUsage({
      imobiliaria_id: options.imobiliaria_id,
      model: attempts[0].model,
      feature: options.feature || 'unknown',
      status: 'error',
      error_log: `All providers failed. Last error: ${lastError}`,
      provider: attempts[0].provider
    });
  }

  throw new Error(`Falha em todos os provedores de IA: ${lastError}`);
}

async function logAIUsage(log: any) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return;
    const provider = log.provider || 'groq';
    const { provider: _, ...cleanLog } = log;
    
    await supabaseAdmin.from('ai_usage_logs').insert([{
      ...cleanLog,
      provider
    }]);
  } catch (e) {
    // Silently handle in offline/mock testing
  }
}

