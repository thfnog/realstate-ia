import { shouldIgnoreMessage } from '../src/lib/messageFilter';

const testCases = [
  { text: 'https://meet.google.com/kji-bpoq-dyw', expected: true, reason: 'Meeting link' },
  { text: 'Goodie! https://meet.google.com/kji-bpoq-dyw', expected: true, reason: 'Short greeting + Meeting link' },
  { text: 'Oi, tudo bem? Gostaria de saber mais sobre o imóvel.', expected: false, reason: 'Legit lead' },
  { text: 'https://www.zapimoveis.com.br/imovel/123', expected: true, reason: 'Just a URL' },
  { text: 'Goodie!', expected: true, reason: 'Random word' },
  { text: 'Oi', expected: false, reason: 'Common greeting' },
  { text: 'Teste', expected: true, reason: 'Test message' },
  { text: 'Tenho interesse no apartamento de 3 quartos no Morumbi.', expected: false, reason: 'Specific interest' },
];

console.log('--- Testando Filtro de Mensagens ---');
testCases.forEach(({ text, expected, reason }) => {
  const result = shouldIgnoreMessage(text);
  const passed = result === expected;
  console.log(`${passed ? '✅' : '❌'} [${reason}] "${text}" -> ${result ? 'IGNORAR' : 'PROCESSAR'} (Esperado: ${expected ? 'IGNORAR' : 'PROCESSAR'})`);
});
