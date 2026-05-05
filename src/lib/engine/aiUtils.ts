import { supabaseAdmin } from '@/lib/supabase';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export type AIModel = 'llama-3.3-70b-versatile' | 'llama-3.1-8b-instant' | 'llama-3.2-11b-vision-preview';

interface AICallOptions {
  model?: AIModel;
  messages: any[];
  temperature?: number;
  response_format?: { type: 'json_object' };
  imobiliaria_id?: string;
  feature?: string;
}

/**
 * Executes an AI call with automatic fallback to secondary models if the primary fails (e.g. Rate Limit 429).
 */
export async function callAIWithFallback(options: AICallOptions): Promise<any> {
  const models: AIModel[] = [
    options.model || 'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama-3.2-11b-vision-preview'
  ];

  // Remove duplicates while keeping order
  const uniqueModels = Array.from(new Set(models));
  
  let lastError = null;

  for (const model of uniqueModels) {
    try {
      console.log(`🤖 Tentando IA com modelo: ${model}...`);
      
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0,
          response_format: options.response_format,
        })
      });

      if (response.status === 429) {
        console.warn(`⚠️ Rate limit atingido para ${model}. Tentando fallback...`);
        lastError = 'Rate limit (429)';
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ Erro na API do Groq (${model}):`, response.status, errText);
        lastError = `Status ${response.status}: ${errText}`;
        continue;
      }

      const data = await response.json();
      
      // Log Success
      if (options.imobiliaria_id) {
        await logAIUsage({
          imobiliaria_id: options.imobiliaria_id,
          model,
          feature: options.feature || 'unknown',
          status: 'success',
          input_tokens: data.usage?.prompt_tokens || 0,
          output_tokens: data.usage?.completion_tokens || 0
        });
      }

      return data;

    } catch (err: any) {
      console.error(`❌ Falha crítica ao chamar IA (${model}):`, err.message);
      lastError = err.message;
    }
  }

  // If all models failed, log final error
  if (options.imobiliaria_id) {
    await logAIUsage({
      imobiliaria_id: options.imobiliaria_id,
      model: uniqueModels[0],
      feature: options.feature || 'unknown',
      status: 'error',
      error_log: `All models failed. Last error: ${lastError}`
    });
  }

  throw new Error(`Falha em todos os modelos de IA: ${lastError}`);
}

async function logAIUsage(log: any) {
  try {
    await supabaseAdmin.from('ai_usage_logs').insert([{
      ...log,
      provider: 'groq'
    }]);
  } catch (e) {
    console.error('Error logging AI usage:', e);
  }
}
