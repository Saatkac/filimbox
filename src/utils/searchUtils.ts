// Türkçe karakterleri normalize et - karakter kodlarıyla
export const normalizeTurkish = (text: string): string => {
  if (!text) return '';
  
  let result = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = text.charCodeAt(i);
    
    // Debug log (silinebilir)
    // console.log(`Char: ${char}, Code: ${code} (0x${code.toString(16)})`);
    
    // Türkçe ve İngilizce i/I varyantları
    // ı = 305 (0x131), İ = 304 (0x130), I = 73 (0x49), i = 105 (0x69)
    if (code === 305 || code === 304 || code === 73 || code === 105) {
      result += 'i';
    }
    // ğ = 287 (0x11F), Ğ = 286 (0x11E)
    else if (code === 287 || code === 286) {
      result += 'g';
    }
    // ü = 252 (0xFC), Ü = 220 (0xDC)
    else if (code === 252 || code === 220) {
      result += 'u';
    }
    // ş = 351 (0x15F), Ş = 350 (0x15E)
    else if (code === 351 || code === 350) {
      result += 's';
    }
    // ö = 246 (0xF6), Ö = 214 (0xD6)
    else if (code === 246 || code === 214) {
      result += 'o';
    }
    // ç = 231 (0xE7), Ç = 199 (0xC7)
    else if (code === 231 || code === 199) {
      result += 'c';
    }
    else {
      result += char.toLowerCase();
    }
  }
  
  return result;
};

// Boşlukları ve özel karakterleri kaldır
export const removeSpacesAndSpecialChars = (text: string): string => {
  return text.replace(/[\s\-_:.,'!?()]/g, '');
};

// Basit arama eşleştirmesi
export const advancedMatch = (text: string, query: string): boolean => {
  if (!text || !query) return false;
  
  const trimmedQuery = query.trim();
  
  // Minimum 2 karakter gerekli
  if (trimmedQuery.length < 2) return false;
  
  const normalizedText = normalizeTurkish(text);
  const normalizedQuery = normalizeTurkish(trimmedQuery);
  
  // 1. Direkt içerik eşleşmesi
  if (normalizedText.includes(normalizedQuery)) {
    return true;
  }
  
  // 2. Boşluksuz eşleşme (alaca karanlık = alacakaranlık)
  const textNoSpaces = removeSpacesAndSpecialChars(normalizedText);
  const queryNoSpaces = removeSpacesAndSpecialChars(normalizedQuery);
  if (queryNoSpaces.length >= 2 && textNoSpaces.includes(queryNoSpaces)) {
    return true;
  }
  
  // 3. Çoklu kelime araması - TÜM kelimeler metinde olmalı
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length >= 2);
  if (queryWords.length > 1) {
    const allWordsMatch = queryWords.every(word => normalizedText.includes(word));
    if (allWordsMatch) return true;
  }
  
  // 4. Tek kelime için kısmi eşleşme
  if (queryWords.length === 1 && queryWords[0].length >= 2) {
    if (normalizedText.includes(queryWords[0])) {
      return true;
    }
  }
  
  return false;
};
