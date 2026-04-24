import { supabaseAdmin } from '@/lib/supabase';
import { Lead, LeadSource, Moeda } from '@/lib/database.types';
import { shouldIgnoreMessage } from '@/lib/messageFilter';

export async function processQueueItem(item: any) {
  const { id, imobiliaria_id, source, payload } = item;

  try {
    if (source === 'whatsapp') {
      await processWhatsappWebhook(imobiliaria_id, payload);
    } else if (source === 'grupozap') {
      await processGrupozapWebhook(imobiliaria_id, payload);
    } else {
      console.warn(`[Queue] Unknown source: ${source}`);
    }

    // Mark as completed
    await supabaseAdmin
      .from('webhook_ingestion_queue')
      .update({ status: 'concluido' })
      .eq('id', id);

  } catch (err: any) {
    console.error(`[Queue] Error processing item ${id}:`, err);
    await supabaseAdmin
      .from('webhook_ingestion_queue')
      .update({ 
        status: 'erro', 
        error_message: err.message,
        retry_count: (item.retry_count || 0) + 1
      })
      .eq('id', id);
  }
}

async function processGrupozapWebhook(imobId: string, body: any) {
  // 1. Normalize Data (Logic from old route)
  const name = body.name || body.lead?.name || body.contact?.name;
  const phone = body.phone || body.lead?.phone || body.contact?.phone;
  const email = body.email || body.lead?.email || body.contact?.email;
  const ddd = body.ddd || body.lead?.ddd || '';
  const message = body.message || body.lead?.message || body.contact?.message;
  const listingId = body.clientListingId || body.originListingId || body.listing?.id;
  const source = body.leadOrigin || body.source || 'ZAP';
  const type = body.extraData?.leadType || 'CONTACT_FORM';
  const finalidade = body.transactionType === 'RENT' ? 'alugar' : 'comprar';

  const fullPhone = ddd ? `${ddd}${phone}` : phone;

  const leadData: Omit<Lead, 'id' | 'criado_em'> = {
    imobiliaria_id: imobId,
    nome: name,
    telefone: normalizePhone(fullPhone),
    origem: 'webhook_grupozap' as LeadSource,
    portal_origem: source,
    moeda: 'BRL' as Moeda,
    finalidade: finalidade as any,
    prazo: null,
    pagamento: null,
    descricao_interesse: message || (listingId ? `Referência Imóvel: ${listingId} (${type})` : null),
    tipo_interesse: null,
    orcamento: null,
    area_interesse: null,
    quartos_interesse: null,
    vagas_interesse: null,
    bairros_interesse: null,
    corretor_id: null,
    status: 'novo',
  };

  // 2. De-duplication check
  const { data: existing } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('imobiliaria_id', imobId)
    .eq('telefone', leadData.telefone)
    .maybeSingle();

  if (existing && !['vendido', 'descartado', 'finalizado'].includes(existing.status)) {
    console.log(`♻️ [Queue] Lead duplicado detectado (${leadData.telefone}).`);
    
    await supabaseAdmin
      .from('leads')
      .update({
        descricao_interesse: `${existing.descricao_interesse || ''}\n--- Novo Interesse ${source} ---\n${leadData.descricao_interesse || ''}`,
        finalidade: leadData.finalidade || existing.finalidade,
      })
      .eq('id', existing.id);

    return;
  }

  // 3. Create Lead
  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .insert(leadData)
    .select()
    .single();

  if (error) throw error;

  // 4. Process Lead
  const { processLead } = await import('@/lib/engine/processLead');
  await processLead(lead as Lead);
}

function normalizePhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}


async function processWhatsappWebhook(imobId: string, body: any) {
  // 1. Normalize Data (Logic moved from old route)
  let senderName = '';
  let phone = '';
  let messageText = '';
  let isFromMe = false;
  let isAudio = false;

  // -- Evolution API Detection --
  if (body.event === 'messages.upsert' || body.data?.key) {
    const data = body.data;
    senderName = data.pushName || 'Contato WhatsApp';
    phone = data.key.remoteJid?.split('@')[0] || '';
    isFromMe = data.key.fromMe || false;
    messageText = data.message?.conversation || data.message?.extendedTextMessage?.text || '';
    
    if (data.message?.audioMessage) {
      isAudio = true;
      messageText = '[Mensagem de Áudio]';
    }
  } 
  // -- Z-API Detection --
  else if (body.callbackType === 'received_message') {
    senderName = body.data.chatName || 'Contato WhatsApp';
    phone = body.data.sender || '';
    isFromMe = body.data.message.fromMe || false;
    messageText = body.data.message.text || '';
    
    if (body.data.message.type === 'audio') {
      isAudio = true;
      messageText = '[Mensagem de Áudio]';
    }
  }

  if (isFromMe) return; // Skip our own messages
  if (shouldIgnoreMessage(messageText)) return;

  // 2. Transcription (If audio)
  if (isAudio && process.env.OPENAI_API_KEY) {
     // Transcription logic (Placeholder for now as in old route)
     messageText = '[Transcrição IA]: ' + messageText; 
  }

  if (!phone) throw new Error('Telefone não identificado no payload');

  // 3. Create Lead
  const leadData: Omit<Lead, 'id' | 'criado_em'> = {
    imobiliaria_id: imobId,
    nome: senderName,
    telefone: phone.startsWith('+') ? phone : `+${phone}`,
    origem: 'whatsapp' as LeadSource,
    portal_origem: 'WhatsApp',
    moeda: 'BRL' as Moeda,
    finalidade: 'comprar',
    prazo: null,
    pagamento: null,
    descricao_interesse: messageText,
    tipo_interesse: null,
    orcamento: null,
    area_interesse: null,
    quartos_interesse: null,
    vagas_interesse: null,
    bairros_interesse: null,
    corretor_id: null,
    status: 'novo',
  };

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .insert(leadData)
    .select()
    .single();

  if (error) throw error;

  // 4. Process Lead (Trigger match and reply)
  const { processLead } = await import('@/lib/engine/processLead');
  await processLead(lead as Lead);
}
