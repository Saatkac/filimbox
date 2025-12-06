import { supabase } from "@/integrations/supabase/client";

// Türkçe karakterleri normalize et
export const normalizeTurkish = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c');
};

// Boşlukları ve özel karakterleri kaldır
export const removeSpacesAndSpecialChars = (text: string): string => {
  return text.replace(/[\s\-_:.,'!?()]/g, '');
};

// API ile çeviri yap
export const translateText = async (text: string, from: string, to: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('translate', {
      body: { text, from, to }
    });
    
    if (error) {
      console.error('Translation error:', error);
      return null;
    }
    
    return data?.translated || null;
  } catch (error) {
    console.error('Translation fetch error:', error);
    return null;
  }
};

// Dil algılama (basit)
export const detectLanguage = (text: string): 'tr' | 'en' => {
  const turkishChars = /[çğıöşüÇĞİÖŞÜ]/;
  if (turkishChars.test(text)) return 'tr';
  
  // Türkçe kelimeler
  const turkishWords = ['ve', 'bir', 'için', 'ile', 'bu', 'da', 'de', 'den', 'dan', 'ki', 'ne', 'var', 'yok'];
  const words = text.toLowerCase().split(/\s+/);
  const hasTurkishWord = words.some(word => turkishWords.includes(word));
  if (hasTurkishWord) return 'tr';
  
  return 'en';
};

// Gelişmiş eşleştirme kontrolü - daha sıkı filtreleme
export const advancedMatch = (text: string, query: string): boolean => {
  if (!text || !query) return false;
  
  // Minimum 2 karakter gerekli
  if (query.trim().length < 2) return false;
  
  const normalizedText = normalizeTurkish(text);
  const normalizedQuery = normalizeTurkish(query.trim());
  
  // Çok kısa sorgular için sadece kelime başı eşleşmesi
  if (normalizedQuery.length < 3) {
    const textWords = normalizedText.split(/\s+/);
    return textWords.some(word => word.startsWith(normalizedQuery));
  }
  
  // Direkt eşleşme (sorgu metin içinde geçiyor mu)
  if (normalizedText.includes(normalizedQuery)) return true;
  
  // Boşluksuz eşleşme (alaca karanlık = alacakaranlık)
  const textNoSpaces = removeSpacesAndSpecialChars(normalizedText);
  const queryNoSpaces = removeSpacesAndSpecialChars(normalizedQuery);
  if (queryNoSpaces.length >= 3 && textNoSpaces.includes(queryNoSpaces)) return true;
  
  // Kelime bazlı eşleşme - TÜM kelimeler metinde olmalı
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length >= 2);
  if (queryWords.length > 1) {
    const allWordsMatch = queryWords.every(word => normalizedText.includes(word));
    if (allWordsMatch) return true;
  }
  
  // Tek kelime sorgular için: kelime başında eşleşme
  if (queryWords.length === 1 && queryWords[0].length >= 3) {
    const textWords = normalizedText.split(/\s+/);
    const hasWordStartMatch = textWords.some(tWord => tWord.startsWith(queryWords[0]));
    if (hasWordStartMatch) return true;
  }
  
  return false;
};