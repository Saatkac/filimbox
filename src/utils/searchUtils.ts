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

// Gelişmiş eşleştirme kontrolü
export const advancedMatch = (text: string, query: string): boolean => {
  if (!text || !query) return false;
  
  const normalizedText = normalizeTurkish(text);
  const normalizedQuery = normalizeTurkish(query);
  
  // Direkt eşleşme
  if (normalizedText.includes(normalizedQuery)) return true;
  
  // Boşluksuz eşleşme (alaca karanlık = alacakaranlık)
  const textNoSpaces = removeSpacesAndSpecialChars(normalizedText);
  const queryNoSpaces = removeSpacesAndSpecialChars(normalizedQuery);
  if (textNoSpaces.includes(queryNoSpaces)) return true;
  
  // Kelime bazlı eşleşme (tüm kelimeler içerik içinde var mı?)
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);
  if (queryWords.length > 1) {
    const allWordsMatch = queryWords.every(word => normalizedText.includes(word));
    if (allWordsMatch) return true;
  }
  
  // Kısmi kelime eşleşmesi (en az bir kelime tam eşleşsin)
  if (queryWords.length >= 1) {
    const textWords = normalizedText.split(/\s+/);
    const hasWordMatch = queryWords.some(qWord => 
      textWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))
    );
    if (hasWordMatch && queryWords.length === 1) return true;
  }
  
  return false;
};