/**
 * Message Debouncer & Aggregator for WhatsApp
 * 
 * Aggregates bursts of inbound messages (text and audio transcripts) from the same sender
 * within a configurable time window (e.g., 3-4s) before triggering the AI Agent.
 */

export interface BufferedMessage {
  text: string;
  sender: string;
  name?: string;
  media_type: string;
  media_url?: string | null;
  transcricao?: string | null;
  transcricao_confianca?: number | null;
  duracao_segundos?: number | null;
  provider_id?: string;
  timestamp: number;
}

export interface DebounceSession {
  key: string;
  imobiliaria_id: string;
  sender: string;
  name: string;
  instanceName?: string;
  messages: BufferedMessage[];
  timer: NodeJS.Timeout | null;
  firstReceivedAt: number;
}

// In-memory buffer map: key = `${imobiliaria_id}:${sender}`
const activeBuffers = new Map<string, DebounceSession>();

const DEBOUNCE_WINDOW_MS = 3500; // 3.5 seconds aggregation window
const MAX_WAIT_MS = 8000; // Max 8 seconds total delay before forced drain

export class MessageDebouncer {
  /**
   * Enqueues an inbound message. If another message arrives within the window,
   * it gets aggregated. Returns a promise that resolves with the aggregated text
   * when the debounce timer finishes.
   */
  static async enqueue(
    imobiliaria_id: string,
    sender: string,
    message: BufferedMessage,
    onDrain: (session: {
      imobiliaria_id: string;
      sender: string;
      name: string;
      aggregatedText: string;
      messages: BufferedMessage[];
      media_type: string;
      media_url: string | null;
      transcricao: string | null;
      transcricao_confianca: number | null;
      duracao_segundos: number | null;
    }) => Promise<void>
  ): Promise<void> {
    const key = `${imobiliaria_id}:${sender}`;
    const now = Date.now();

    let session = activeBuffers.get(key);

    if (!session) {
      session = {
        key,
        imobiliaria_id,
        sender,
        name: message.name || '',
        messages: [message],
        timer: null,
        firstReceivedAt: now
      };
      activeBuffers.set(key, session);
    } else {
      session.messages.push(message);
      if (message.name && !session.name) session.name = message.name;
    }

    // Clear previous timer if within max wait window
    if (session.timer) {
      clearTimeout(session.timer);
    }

    const elapsed = now - session.firstReceivedAt;
    const remainingTime = Math.max(500, Math.min(DEBOUNCE_WINDOW_MS, MAX_WAIT_MS - elapsed));

    session.timer = setTimeout(async () => {
      activeBuffers.delete(key);

      const msgs = session!.messages;
      const aggregatedText = msgs
        .map(m => m.text)
        .filter(Boolean)
        .join(' \n');

      // Primary audio metadata if any
      const audioMsg = msgs.find(m => m.media_type === 'audio');

      try {
        await onDrain({
          imobiliaria_id: session!.imobiliaria_id,
          sender: session!.sender,
          name: session!.name,
          aggregatedText,
          messages: msgs,
          media_type: audioMsg ? 'audio' : 'text',
          media_url: audioMsg?.media_url || null,
          transcricao: audioMsg?.transcricao || null,
          transcricao_confianca: audioMsg?.transcricao_confianca || null,
          duracao_segundos: audioMsg?.duracao_segundos || null
        });
      } catch (err: any) {
        console.error(`❌ [MessageDebouncer] Erro no callback de drain para ${key}:`, err);
      }
    }, remainingTime);
  }

  /**
   * Clears any active debounce buffer for a specific sender
   */
  static clear(imobiliaria_id: string, sender: string) {
    const key = `${imobiliaria_id}:${sender}`;
    const session = activeBuffers.get(key);
    if (session?.timer) {
      clearTimeout(session.timer);
    }
    activeBuffers.delete(key);
  }
}
