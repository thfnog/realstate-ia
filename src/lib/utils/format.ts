/**
 * Formata um número para moeda brasileira (BRL) sem o prefixo R$
 * Ex: 1234.56 -> "1.234,56"
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numericValue)) return '';

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

/**
 * Converte uma string formatada ("1.234,56") de volta para número (1234.56)
 */
export function parseCurrency(value: string): number {
  if (!value) return 0;
  
  // Remove tudo que não é dígito
  const cleanValue = value.replace(/\D/g, '');
  
  // Converte para centavos e depois para decimal
  const numericValue = parseInt(cleanValue, 10) / 100;
  
  return isNaN(numericValue) ? 0 : numericValue;
}

/**
 * Máscara para input de moeda em tempo real
 * Recebe o valor digitado e retorna a string formatada
 */
export function maskCurrency(value: string): string {
  const numericValue = parseCurrency(value);
  return formatCurrency(numericValue);
}
