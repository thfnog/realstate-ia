/**
 * Timezone helpers — o servidor (Vercel) roda em UTC, mas agenda/visitas
 * precisam ser calculadas no fuso local da imobiliária.
 */

export const DEFAULT_TZ = 'America/Sao_Paulo';

export function tzForCountry(pais?: 'BR' | 'PT' | string | null): string {
  return pais === 'PT' ? 'Europe/Lisbon' : DEFAULT_TZ;
}

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = domingo
}

const WEEKDAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Retorna as partes de data/hora de um instante no fuso informado. */
export function getZonedParts(date: Date, tz: string = DEFAULT_TZ): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short'
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: WEEKDAY_MAP[parts.weekday] ?? 0
  };
}

/** Offset (em minutos) do fuso em relação a UTC num dado instante. Ex: São Paulo = -180. */
export function getTzOffsetMinutes(date: Date, tz: string = DEFAULT_TZ): number {
  const p = getZonedParts(date, tz);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUTC - Math.floor(date.getTime() / 60000) * 60000) / 60000);
}

/** Cria um Date para "ano-mês-dia hora:min" interpretados no fuso informado. */
export function zonedDate(year: number, month: number, day: number, hour: number, minute = 0, tz: string = DEFAULT_TZ): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offset = getTzOffsetMinutes(guess, tz);
  const result = new Date(guess.getTime() - offset * 60000);
  // Corrige transições de horário de verão (offset pode mudar entre guess e result)
  const offset2 = getTzOffsetMinutes(result, tz);
  return offset2 === offset ? result : new Date(guess.getTime() - offset2 * 60000);
}

/** Soma N dias ao "hoje" local e devolve as partes (ano/mês/dia/weekday) no fuso. */
export function addLocalDays(base: Date, days: number, tz: string = DEFAULT_TZ): ZonedParts {
  const p = getZonedParts(base, tz);
  // meio-dia evita problemas de virada de dia por DST
  return getZonedParts(zonedDate(p.year, p.month, p.day + days, 12, 0, tz), tz);
}

/** Rótulo amigável: "sáb., 02/11 às 10:00" */
export function formatSlotLabel(date: Date, tz: string = DEFAULT_TZ): string {
  const day = date.toLocaleDateString('pt-BR', { timeZone: tz, weekday: 'short', day: '2-digit', month: '2-digit' });
  const time = date.toLocaleTimeString('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
  return `${day} às ${time}`;
}

/** Chave de hora (UTC) para detecção de conflito de agenda. */
export function hourKey(date: Date): string {
  return date.toISOString().substring(0, 13);
}
