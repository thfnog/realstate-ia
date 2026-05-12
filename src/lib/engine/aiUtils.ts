import { supabaseAdmin } from '@/lib/supabase';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export type AIModel = 'llama-3.3-70b-versatile' | 'llama-3.1-8b-instant' | 'llama-3.2-11b-vision-preview' | 'gpt-4o-mini' | 'gpt-4o';

export function parseSafeJSON(str: string): any {
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch (e) {
    const match = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    const firstBrace = str.indexOf('{');
    const lastBrace = str.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
       return JSON.parse(str.substring(firstBrace, lastBrace + 1));
    }
    throw e;
  }
}

interface AICallOptions {
  model?: AIModel;
  messages: any[];
  temperature?: number;
  response_format?: { type: 'json_object' };
  imobiliaria_id?: string;
  feature?: string;
}

/**
 * Executes an AI call using dynamic multi-provider routing (OpenRouter -> Groq -> OpenAI)
 * ensuring zero downtime even if credit limits or rate limits are hit.
 */
export async function callAIWithFallback(options: AICallOptions): Promise<any> {
  const baseModel = options.model || 'llama-3.3-70b-versatile';
  const attempts: { model: string; provider: 'openrouter' | 'groq' | 'openai'; url: string; key: string }[] = [];

  // 1. OpenRouter (Prioridade Máxima se configurado — sem teto diário)
  if (OPENROUTER_API_KEY) {
     const orModel = baseModel === 'llama-3.3-70b-versatile' ? 'meta-llama/llama-3.3-70b-instruct' : 
                     baseModel === 'llama-3.1-8b-instant' ? 'meta-llama/llama-3.1-8b-instruct' : baseModel;
     attempts.push({ 
       model: orModel, 
       provider: 'openrouter', 
       url: OPENROUTER_URL, 
       key: OPENROUTER_API_KEY 
     });
  }

  // 2. Groq (Rápido, gratuito, entra como principal se não houver OpenRouter ou como Fallback)
  if (GROQ_API_KEY || !OPENROUTER_API_KEY) {
     attempts.push({ 
       model: baseModel, 
       provider: 'groq', 
       url: GROQ_URL, 
       key: GROQ_API_KEY 
     });
     // Adiciona o 8b da Groq como estepe secundário leve
     if (baseModel !== 'llama-3.1-8b-instant') {
        attempts.push({ 
          model: 'llama-3.1-8b-instant', 
          provider: 'groq', 
          url: GROQ_URL, 
          key: GROQ_API_KEY 
        });
     }
  }

  // 3. OpenAI (O Estepe Infalível de Produção)
  if (OPENAI_API_KEY) {
     attempts.push({ 
       model: 'gpt-4o-mini', 
       provider: 'openai', 
       url: OPENAI_URL, 
       key: OPENAI_API_KEY 
     });
  }

  let lastError = null;

  for (const target of attempts) {
    try {
      if (!target.key) continue;

      console.log(`🤖 Chamando IA via [${target.provider.toUpperCase()}] com modelo: ${target.model}...`);
      
      // OpenRouter exige um cabeçalho extra para identificar a requisição corretamente
      const headers: any = {
        'Authorization': `Bearer ${target.key}`,
        'Content-Type': 'application/json'
      };
      if (target.provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://realstate-ia.vercel.app';
        headers['X-Title'] = 'ImobIA Engine';
      }

      const response = await fetch(target.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: target.model,
          messages: options.messages,
          temperature: options.temperature ?? 0,
          response_format: target.provider === 'openrouter' ? undefined : options.response_format, // OpenRouter lida com JSON via prompt no Llama
        })
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

      const data = await response.json();
      
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
    const provider = log.provider || 'groq';
    // Removemos provider extra do spread se houver para evitar sobrescritas
    const { provider: _, ...cleanLog } = log;
    
    await supabaseAdmin.from('ai_usage_logs').insert([{
      ...cleanLog,
      provider
    }]);
  } catch (e) {
    console.error('Error logging AI usage:', e);
  }
}

