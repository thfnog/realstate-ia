/**
 * Country Configuration — PT (Portugal) vs BR (Brasil)
 * 
 * Centralizes all country-specific behavior: currency, phone format,
 * terminology, and active channels.
 */

export type CountryCode = 'PT' | 'BR';

export interface CountryConfig {
  code: CountryCode;
  label: string;
  flag: string;
  currency: { code: string; symbol: string; locale: string };
  phoneFormat: { placeholder: string; mask: RegExp; prefix: string; example: string };
  terminology: {
    quartos: (n: number) => string;
    quartosLabel: string;
    quartosOptions: { value: string; label: string }[];
    corretor: string;
    corretorPlural: string;
  };
  channels: { form: boolean; email: boolean; webhook: boolean; whatsapp: boolean };
}

const PT_CONFIG: CountryConfig = {
  code: 'PT',
  label: 'Portugal',
  flag: '🇵🇹',
  currency: { code: 'EUR', symbol: '€', locale: 'pt-PT' },
  phoneFormat: {
    placeholder: '+351 9XX XXX XXX',
    mask: /^\+?351?\d{0,9}$/,
    prefix: '+351',
    example: '+351 912 345 678',
  },
  terminology: {
    quartos: (n: number) => `T${n}`,
    quartosLabel: 'Tipologia',
    quartosOptions: [
      { value: '0', label: 'T0 (Estúdio)' },
      { value: '1', label: 'T1' },
      { value: '2', label: 'T2' },
      { value: '3', label: 'T3' },
      { value: '4', label: 'T4' },
      { value: '5', label: 'T5+' },
    ],
    corretor: 'Consultor',
    corretorPlural: 'Consultores',
  },
  channels: { form: true, email: true, webhook: false, whatsapp: false },
};

const BR_CONFIG: CountryConfig = {
  code: 'BR',
  label: 'Brasil',
  flag: '🇧🇷',
  currency: { code: 'BRL', symbol: 'R$', locale: 'pt-BR' },
  phoneFormat: {
    placeholder: '(00) 00000-0000',
    mask: /^\(?\d{0,2}\)?\s?\d{0,5}-?\d{0,4}$/,
    prefix: '+55',
    example: '(11) 91234-5678',
  },
  terminology: {
    quartos: (n: number) => n === 1 ? '1 quarto' : `${n} quartos`,
    quartosLabel: 'Quartos',
    quartosOptions: [
      { value: '1', label: '1 quarto' },
      { value: '2', label: '2 quartos' },
      { value: '3', label: '3 quartos' },
      { value: '4', label: '4+ quartos' },
    ],
    corretor: 'Corretor',
    corretorPlural: 'Corretores',
  },
  channels: { form: true, email: false, webhook: true, whatsapp: true },
};

const configs: Record<CountryCode, CountryConfig> = {
  PT: PT_CONFIG,
  BR: BR_CONFIG,
};

/**
 * Returns the active country configuration based on COUNTRY_MODE env var.
 * Defaults to PT (Portugal) if not set.
 */
export function getConfig(): CountryConfig {
  const mode = (process.env.NEXT_PUBLIC_COUNTRY_MODE || 'PT').toUpperCase() as CountryCode;
  return configs[mode] || configs.PT;
}

/**
 * Formats a monetary value according to the active country's config.
 */
export function formatCurrency(value: number, config?: CountryConfig): string {
  const c = config || getConfig();
  return value.toLocaleString(c.currency.locale, {
    style: 'currency',
    currency: c.currency.code,
  });
}

/**
 * Formats quartos/tipologia label according to country.
 */
export function formatQuartos(n: number, config?: CountryConfig): string {
  const c = config || getConfig();
  return c.terminology.quartos(n);
}

/**
 * Returns a human-readable label for a lead source.
 */
export function getOrigemLabel(origem: string): { label: string; icon: string; color: string } {
  const map: Record<string, { label: string; icon: string; color: string }> = {
    formulario: { label: 'Formulário', icon: '📝', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    email_ego: { label: 'E-mail eGO', icon: '📧', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    webhook_grupozap: { label: 'Grupo OLX', icon: '🌐', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    whatsapp: { label: 'WhatsApp', icon: '💬', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    manual: { label: 'Manual', icon: '✍️', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  };
  return map[origem] || { label: origem, icon: '❓', color: 'bg-slate-50 text-slate-600 border-slate-200' };
}
