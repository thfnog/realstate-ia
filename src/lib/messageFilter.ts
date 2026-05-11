/**
 * Message filtering logic to ignore irrelevant messages (junk, spam, random links).
 */

const JUNK_URL_PATTERNS = [
  'meet.google.com',
  'zoom.us',
  'teams.microsoft.com',
  'teams.live.com',
  'webex.com',
  'calendly.com',
];

// Greetings are NOT filtered — they are valid first-contact messages.
// The bot should respond to "Oi", "Bom dia", etc. as new leads.

/**
 * Returns true if the message should be ignored by the bot.
 */
export function shouldIgnoreMessage(text: string): boolean {
  if (!text) return true;

  const normalized = text.trim().toLowerCase();

  // 1. Check for meeting links (usually spam/wrong number if it's JUST the link)
  const containsMeetingLink = JUNK_URL_PATTERNS.some(pattern => normalized.includes(pattern));
  
  // If it contains a meeting link, we check if it has other "substantial" content.
  // If it's mostly just the link or a short greeting + link, we ignore it.
  if (containsMeetingLink) {
    // If the message is short (less than 50 chars) and contains a meeting link, likely junk
    if (normalized.length < 100) {
      console.log(`[Filter] Ignorando mensagem com link de reunião: "${normalized}"`);
      return true;
    }
  }

  // 2. Check if it's ONLY a URL
  const urlRegex = /^(https?:\/\/[^\s]+)$/i;
  if (urlRegex.test(normalized)) {
     console.log(`[Filter] Ignorando mensagem que é apenas uma URL: "${normalized}"`);
     return true;
  }

  // 3. Very short random words — but allow greetings (oi, olá, etc.)
  const greetings = ['oi', 'olá', 'ola', 'opa', 'hey', 'hi', 'hello', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'tudo bom', 'td bem', 'blz', 'e aí', 'eai'];
  if (normalized.length < 3 && !greetings.includes(normalized)) {
    console.log(`[Filter] Ignorando mensagem muito curta e estranha: "${normalized}"`);
    return true;
  }

  // 4. Specific "noise" words that don't indicate a lead
  const noiseWords = [
    'goodie', 'teste', 'testando', 'spam', 
    'correndo', 'correria', 'correria braba', 'semana corrida',
    'trânsito', 'transito',
    'atendendo', 'em reunião', 'em reuniao',
    'ok', 'beleza', 'combinado', 'fechado',
    'vlw', 'valeu', 'obrigado', 'obrigada'
  ];

  if (noiseWords.some(word => normalized === word || normalized === `${word}!` || normalized === `${word}.`)) {
    console.log(`[Filter] Ignorando palavra de ruído/status: "${normalized}"`);
    return true;
  }

  return false;
}
