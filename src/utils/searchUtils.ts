// Türkçe karakterleri normalize et
export const normalizeTurkish = (text: string): string => {
  if (!text) return '';
  
  // Önce küçük harfe çevir
  let normalized = text.toLowerCase();
  
  // Türkçe karakterleri ASCII eşdeğerlerine dönüştür
  const charMap: Record<string, string> = {
    'ı': 'i', 'İ': 'i', 'I': 'i',
    'ğ': 'g', 'Ğ': 'g',
    'ü': 'u', 'Ü': 'u',
    'ş': 's', 'Ş': 's',
    'ö': 'o', 'Ö': 'o',
    'ç': 'c', 'Ç': 'c',
  };
  
  let result = '';
  for (const char of normalized) {
    result += charMap[char] || char;
  }
  
  return result;
};

// Boşlukları ve özel karakterleri kaldır
export const removeSpacesAndSpecialChars = (text: string): string => {
  return text.replace(/[\s\-_:.,'!?()]/g, '');
};

// Gelişmiş arama eşleştirmesi - Türkçe karakterler ve boşluklar için
export const advancedMatch = (text: string, query: string): boolean => {
  if (!text || !query) return false;
  
  const trimmedQuery = query.trim();
  
  // Minimum 2 karakter gerekli
  if (trimmedQuery.length < 2) return false;
  
  const normalizedText = normalizeTurkish(text);
  const normalizedQuery = normalizeTurkish(trimmedQuery);
  
  // 1. Direkt içerik eşleşmesi (örn: "alacakaranlık" içinde "alacakaranlık")
  if (normalizedText.includes(normalizedQuery)) {
    return true;
  }
  
  // 2. Boşluksuz eşleşme (örn: "alaca karanlik" -> "alacakaranlik" eşleşir "alacakaranlık")
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
    
    // Ayrıca boşluksuz versiyonda da kelime parçalarını ara
    const allWordsMatchNoSpaces = queryWords.every(word => textNoSpaces.includes(word));
    if (allWordsMatchNoSpaces) return true;
  }
  
  // 4. Tek kelime için kısmi eşleşme
  if (queryWords.length === 1 && queryWords[0].length >= 2) {
    if (normalizedText.includes(queryWords[0])) {
      return true;
    }
  }
  
  return false;
};

// Supabase için sorgu oluştur - Türkçe karakter varyasyonları ile
export const generateSearchVariants = (query: string): string[] => {
  if (!query) return [];
  
  const trimmed = query.trim();
  const variants: string[] = [trimmed];
  
  // Boşluksuz versiyonu ekle
  const noSpaces = trimmed.replace(/\s+/g, '');
  if (noSpaces !== trimmed) {
    variants.push(noSpaces);
  }
  
  // ASCII versiyonu (i -> i, ı -> i, ö -> o, vb.)
  const asciiVersion = normalizeTurkish(trimmed);
  if (asciiVersion !== trimmed.toLowerCase()) {
    variants.push(asciiVersion);
    // ASCII boşluksuz
    const asciiNoSpaces = asciiVersion.replace(/\s+/g, '');
    if (asciiNoSpaces !== asciiVersion) {
      variants.push(asciiNoSpaces);
    }
  }
  
  // Türkçe versiyon (i -> ı, o -> ö, vb.)
  const turkishCharMap: Record<string, string> = {
    'i': 'ı', 'I': 'İ',
    'o': 'ö', 'O': 'Ö',
    'u': 'ü', 'U': 'Ü',
    's': 'ş', 'S': 'Ş',
    'g': 'ğ', 'G': 'Ğ',
    'c': 'ç', 'C': 'Ç',
  };
  
  let turkishVariant = '';
  for (const char of trimmed) {
    turkishVariant += turkishCharMap[char] || char;
  }
  if (turkishVariant !== trimmed) {
    variants.push(turkishVariant);
    // Türkçe boşluksuz
    const turkishNoSpaces = turkishVariant.replace(/\s+/g, '');
    if (turkishNoSpaces !== turkishVariant) {
      variants.push(turkishNoSpaces);
    }
  }
  
  return [...new Set(variants)];
};