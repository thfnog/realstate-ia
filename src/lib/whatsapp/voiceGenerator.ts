/**
 * WhatsApp Voice Note Generator (Text-to-Speech)
 * 
 * Generates natural human-like voice audios (PT-BR / PT-PT) for WhatsApp
 * when leads communicate primarily through voice notes.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export class VoiceGenerator {
  /**
   * Converts textual message into a human-like voice audio Buffer (MP3/OGG)
   */
  static async generateVoiceAudio(
    text: string,
    options: {
      voice?: 'alloy' | 'nova' | 'onyx' | 'shimmer' | 'echo' | 'fable';
      speed?: number;
    } = {}
  ): Promise<Buffer | null> {
    const key = process.env.OPENAI_API_KEY || OPENAI_API_KEY;
    if (!key || !text || text.trim().length === 0) {
      return null;
    }

    try {
      // Clean emojis, markdown symbols, and technical formatting for clean pronunciation
      const cleanText = text
        .replace(/[*_~`#]/g, '')
        .replace(/https?:\/\/\S+/g, 'link do imóvel')
        .replace(/R\$\s*/g, 'reais ')
        .replace(/€\s*/g, 'euros ')
        .trim();

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: options.voice || 'nova',
          input: cleanText,
          speed: options.speed || 1.0,
          response_format: 'mp3'
        })
      });

      if (!response.ok) {
        console.warn(`⚠️ [VoiceGenerator] Falha na síntese de voz (${response.status}):`, await response.text());
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err: any) {
      console.warn('⚠️ [VoiceGenerator] Erro ao gerar áudio TTS:', err.message);
      return null;
    }
  }
}
