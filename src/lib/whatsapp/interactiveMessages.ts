/**
 * WhatsApp Interactive Messages — Evolution API
 * 
 * Provides functions for sending interactive messages (buttons, lists).
 * Since we use Baileys connector, interactive buttons/lists may not render.
 * All functions include a TEXT FALLBACK with numbered options.
 */

import { sendWhatsAppMessage } from '@/lib/whatsapp';

const EVOLUTION_URL = process.env.EVOLUTION_URL?.trim().replace(/[\r\n]/g, '').replace(/\/$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY?.trim().replace(/[\r\n]/g, '');
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://realstate-ia.vercel.app').replace(/\/$/, '');

export interface PropertyCard {
  titulo: string;
  tipo: string;
  freguesia: string;
  quartos: number | null;
  vagas_garagem: number;
  valor: number;
  referencia: string;
  id: string;
  area_util?: number | null;
}

export interface TimeSlot {
  label: string;       // "Terça (13/05) às 10:00"
  isoDateTime: string; // "2025-05-13T10:00:00"
  slotId: string;      // "slot_1"
}

/**
 * Build a formatted text message for property recommendations.
 * Uses numbered options as fallback since Baileys doesn't support interactive buttons.
 */
export function buildPropertyMessage(properties: PropertyCard[], leadName?: string): string {
  const greeting = properties.length === 1
    ? 'Encontrei uma opção que pode fazer sentido pra você:'
    : `Separei ${properties.length} opções que podem fazer sentido pra você:`;

  const lines: string[] = [greeting, ''];

  properties.forEach((p, idx) => {
    const num = idx + 1;
    const tipoLabel = p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1).replace(/_/g, ' ');
    const valorFmt = p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const area = p.area_util ? ` • ${p.area_util}m²` : '';
    const quartos = p.quartos ? ` • ${p.quartos} qto${p.quartos > 1 ? 's' : ''}` : '';
    const vagas = p.vagas_garagem ? ` • ${p.vagas_garagem} vaga${p.vagas_garagem > 1 ? 's' : ''}` : '';
    const url = `${APP_URL}/imoveis/${p.id}`;

    lines.push(`*${num}️⃣ ${tipoLabel} — ${p.freguesia}*`);
    lines.push(`💰 ${valorFmt}${quartos}${vagas}${area}`);
    lines.push(`🔗 Ver detalhes: ${url}`);
    lines.push(`Ref: ${p.referencia}`);
    lines.push('');
  });

  lines.push('Responda com o *número* do imóvel que te interessa, ou diga o que gostaria de diferente 👍');

  return lines.join('\n');
}

/**
 * Build a text message with available time slots for scheduling.
 * Uses numbered options as fallback for Baileys.
 */
export function buildTimeSlotsMessage(slots: TimeSlot[], propertyTitle?: string): string {
  const lines: string[] = [];

  lines.push(`📅 Verifiquei a agenda e temos esses horários disponíveis${propertyTitle ? ` para visitar o *${propertyTitle}*` : ''}:`);
  lines.push('');

  slots.forEach((slot, idx) => {
    lines.push(`*${idx + 1}️⃣* ${slot.label}`);
  });

  lines.push('');
  lines.push('Responda com o *número* do horário que fica melhor pra você 🗓️');

  return lines.join('\n');
}

/**
 * Build a quick reply message with numbered options.
 */
export function buildQuickReplyMessage(text: string, options: string[]): string {
  const lines = [text, ''];

  options.forEach((opt, idx) => {
    lines.push(`*${idx + 1}️⃣* ${opt}`);
  });

  return lines.join('\n');
}

/**
 * Try to send an interactive button message via Evolution API.
 * Falls back to text with numbered options if it fails (Baileys).
 */
export async function sendInteractiveButtons(
  phone: string,
  title: string,
  description: string,
  buttons: { displayText: string; id: string }[],
  instanceName: string,
  countryCode?: string
): Promise<string> {
  // Since we're on Baileys, go straight to text fallback
  const fallbackText = buildQuickReplyMessage(
    `${title}\n${description}`,
    buttons.map(b => b.displayText)
  );

  return sendWhatsAppMessage(phone, fallbackText, instanceName, countryCode);
}

/**
 * Send property recommendations to a lead.
 */
export async function sendPropertyRecommendations(
  phone: string,
  properties: PropertyCard[],
  instanceName: string,
  countryCode?: string,
  leadName?: string
): Promise<string> {
  const message = buildPropertyMessage(properties, leadName);
  return sendWhatsAppMessage(phone, message, instanceName, countryCode);
}

/**
 * Send scheduling time slots to a lead.
 */
export async function sendSchedulingSlots(
  phone: string,
  slots: TimeSlot[],
  instanceName: string,
  countryCode?: string,
  propertyTitle?: string
): Promise<string> {
  const message = buildTimeSlotsMessage(slots, propertyTitle);
  return sendWhatsAppMessage(phone, message, instanceName, countryCode);
}

/**
 * Get the public URL for a property.
 */
export function getPropertyUrl(propertyId: string): string {
  return `${APP_URL}/imoveis/${propertyId}`;
}
