import { supabaseAdmin } from '@/lib/supabase';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

interface TranscribeResult {
  text: string;
  confidence: number;
}

/**
 * Transcribes audio message (base64) using Groq Whisper with OpenAI Whisper fallback
 */
export async function transcribeAudio(
  base64Data: string,
  mimeType: string,
  imobiliaria_id?: string
): Promise<TranscribeResult | null> {
  if (!base64Data) {
    console.error('[AudioTranscriber] Base64 data is empty');
    return null;
  }

  const buffer = Buffer.from(base64Data, 'base64');
  
  // Detect extension based on mimetype
  let extension = 'ogg';
  if (mimeType.includes('mp3')) extension = 'mp3';
  else if (mimeType.includes('wav')) extension = 'wav';
  else if (mimeType.includes('m4a')) extension = 'm4a';

  const providers = [];

  // Groq Whisper
  if (GROQ_API_KEY) {
    providers.push({
      name: 'groq',
      url: 'https://api.groq.com/openai/v1/audio/transcriptions',
      key: GROQ_API_KEY,
    });
  }

  // OpenAI Whisper fallback
  if (OPENAI_API_KEY) {
    providers.push({
      name: 'openai',
      url: 'https://api.openai.com/v1/audio/transcriptions',
      key: OPENAI_API_KEY,
    });
  }

  if (providers.length === 0) {
    console.error('[AudioTranscriber] No transcription providers configured (missing GROQ_API_KEY or OPENAI_API_KEY)');
    return null;
  }

  let lastError = null;

  for (const provider of providers) {
    try {
      console.log(`🎙️ [AudioTranscriber] Attempting transcription via ${provider.name.toUpperCase()}...`);
      
      const formData = new FormData();
      const blob = new Blob([buffer], { type: mimeType });
      
      // Node fetch needs a filename for files in FormData
      formData.append('file', blob, `audio.${extension}`);
      formData.append('model', 'whisper-1');
      formData.append('language', 'pt');

      const response = await fetch(provider.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.key}`
        },
        body: formData
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ [AudioTranscriber] Error from ${provider.name.toUpperCase()} (${response.status}): ${errText}`);
        lastError = `${provider.name} (${response.status}): ${errText}`;
        continue;
      }

      const data = await response.json();
      if (data && typeof data.text === 'string') {
        console.log(`🎙️ [AudioTranscriber] Success via ${provider.name.toUpperCase()}! Text length: ${data.text.length}`);
        
        // Log AI usage for metrics if imobiliaria_id is provided
        if (imobiliaria_id) {
          try {
            await supabaseAdmin.from('ai_usage_logs').insert([{
              imobiliaria_id,
              model: 'whisper-1',
              feature: 'audio_transcription',
              status: 'success',
              provider: provider.name
            }]);
          } catch (logErr) {
            console.error('Error logging transcription usage:', logErr);
          }
        }

        return {
          text: data.text.trim(),
          confidence: 0.95 // Whisper standard confidence mock (Whisper API doesn't return confidence directly)
        };
      }
    } catch (err: any) {
      console.error(`❌ [AudioTranscriber] Critical failure in ${provider.name}:`, err.message);
      lastError = err.message;
    }
  }

  // Log error if all failed
  if (imobiliaria_id) {
    try {
      await supabaseAdmin.from('ai_usage_logs').insert([{
        imobiliaria_id,
        model: 'whisper-1',
        feature: 'audio_transcription',
        status: 'error',
        error_log: `All providers failed: ${lastError}`,
        provider: providers[0]?.name || 'unknown'
      }]);
    } catch (logErr) {
      console.error('Error logging transcription error:', logErr);
    }
  }

  return null;
}
