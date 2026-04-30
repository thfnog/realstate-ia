function extractLeadFromText(text) {
  const normalized = text.toLowerCase();
  
  const profile = {};

  // 1. Extração de Tipo
  if (normalized.includes('apartamento') || normalized.includes('apto') || normalized.includes(' ap ')) {
    profile.tipo_interesse = 'apartamento';
  } else if (normalized.includes('casa') || normalized.includes('sobrado') || normalized.includes('vilas')) {
    profile.tipo_interesse = 'casa';
  } else if (normalized.includes('lote') || normalized.includes('terreno')) {
    profile.tipo_interesse = 'terreno';
  }

  // 4. Extração de Quartos
  const roomsMatch = normalized.match(/(\d)\s*(quarto|dormitorio|suíte|suite)/);
  if (roomsMatch) {
    profile.quartos = parseInt(roomsMatch[1]);
  }

  return profile;
}

const text = "Quero um apartamento de 3 a 4 quartos com mais de 2 garagens";
const profile = extractLeadFromText(text);

console.log('Text:', text);
console.log('Extracted Profile:', JSON.stringify(profile, null, 2));
