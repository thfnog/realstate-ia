/**
 * Document Template Engine
 * Handles variable replacement in Markdown templates
 */

export function processTemplate(template: string, data: Record<string, any>): string {
  let processed = template;

  const variables = {
    'lead_nome': data.lead?.nome || '—',
    'lead_cpf_nif': data.lead?.identificador_fiscal || '—',
    'imovel_titulo': data.imovel?.titulo || '—',
    'imovel_endereco': `${data.imovel?.rua || ''}, ${data.imovel?.numero || ''} - ${data.imovel?.freguesia || ''}`,
    'valor_total': data.valor_total?.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) || '—',
    'data_inicio': data.data_inicio ? new Date(data.data_inicio).toLocaleDateString('pt-PT') : '—',
    'corretor_nome': data.corretor?.nome || '—',
    'data_hoje': new Date().toLocaleDateString('pt-PT'),
    ...data.custom_vars
  };

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, String(value));
  });

  return processed;
}

export const DEFAULT_VENDA_TEMPLATE = `
# CONTRATO DE PROMESSA DE COMPRA E VENDA

**PROMITENTE VENDEDOR:** Imobiliária ImobIA, com sede em...

**PROMITENTE COMPRADOR:** {{lead_nome}}, titular do NIF {{lead_cpf_nif}}.

**OBJETO:** O imóvel situado em {{imovel_endereco}}, conhecido como {{imovel_titulo}}.

**VALOR:** O valor total da transação é de {{valor_total}}.

**CONDIÇÕES:**
1. O contrato tem início em {{data_inicio}}.
2. O corretor responsável pela mediação é {{corretor_nome}}.

Assinado em {{data_hoje}}.

_________________________________
{{lead_nome}}
`;
