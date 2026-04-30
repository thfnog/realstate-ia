import { extractLeadFromText } from '../src/lib/engine/extractLeadFromText';

const text = "Quero um apartamento de 3 a 4 quartos com mais de 2 garagens";
const profile = extractLeadFromText(text);

console.log('Text:', text);
console.log('Extracted Profile:', JSON.stringify(profile, null, 2));
