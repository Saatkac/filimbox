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

// Türkçe-İngilizce film isim eşleştirmeleri
const movieTranslations: Record<string, string[]> = {
  // Türkçe -> İngilizce ve alternatifler
  'kırmızı bülten': ['red notice'],
  'red notice': ['kırmızı bülten'],
  'alacakaranlık': ['twilight'],
  'twilight': ['alacakaranlık', 'alaca karanlık'],
  'hızlı ve öfkeli': ['fast and furious', 'fast & furious'],
  'fast and furious': ['hızlı ve öfkeli', 'hizli ve ofkeli'],
  'yüzüklerin efendisi': ['lord of the rings'],
  'lord of the rings': ['yüzüklerin efendisi'],
  'hobbit': ['hobbit'],
  'avatar': ['avatar'],
  'titanic': ['titanic'],
  'inception': ['başlangıç', 'baslangic'],
  'başlangıç': ['inception'],
  'interstellar': ['yıldızlararası', 'yildizlararasi'],
  'yıldızlararası': ['interstellar'],
  'the matrix': ['matrix'],
  'matrix': ['the matrix'],
  'gladyatör': ['gladiator'],
  'gladiator': ['gladyatör', 'gladyator'],
  'braveheart': ['cesur yürek'],
  'cesur yürek': ['braveheart'],
  'forrest gump': ['forrest gump'],
  'the godfather': ['baba'],
  'baba': ['the godfather', 'godfather'],
  'the dark knight': ['kara şövalye'],
  'kara şövalye': ['the dark knight', 'dark knight'],
  'fight club': ['dövüş kulübü'],
  'dövüş kulübü': ['fight club'],
  'pulp fiction': ['ucuz roman'],
  'ucuz roman': ['pulp fiction'],
  'schindler\'s list': ['schindler\'in listesi'],
  'schindler\'in listesi': ['schindler\'s list'],
  'the shawshank redemption': ['esaretin bedeli'],
  'esaretin bedeli': ['the shawshank redemption', 'shawshank redemption'],
  'the silence of the lambs': ['kuzuların sessizliği'],
  'kuzuların sessizliği': ['the silence of the lambs', 'silence of the lambs'],
  'seven': ['yedi'],
  'yedi': ['seven', 'se7en'],
  'the prestige': ['prestij'],
  'prestij': ['the prestige', 'prestige'],
  'memento': ['akıl defteri'],
  'akıl defteri': ['memento'],
  'shutter island': ['zindan adası'],
  'zindan adası': ['shutter island'],
  'the departed': ['köstebek'],
  'köstebek': ['the departed', 'departed'],
  'goodfellas': ['sıkı dostlar'],
  'sıkı dostlar': ['goodfellas'],
  'casino': ['casino', 'kumarhane'],
  'scarface': ['yaralı yüz'],
  'yaralı yüz': ['scarface'],
  'heat': ['büyük hesaplaşma'],
  'büyük hesaplaşma': ['heat'],
  'the green mile': ['yeşil yol'],
  'yeşil yol': ['the green mile', 'green mile'],
  'saving private ryan': ['er ryan\'ı kurtarmak'],
  'er ryan\'ı kurtarmak': ['saving private ryan'],
  'black panther': ['kara panter'],
  'kara panter': ['black panther'],
  'spider-man': ['örümcek adam'],
  'örümcek adam': ['spider-man', 'spiderman'],
  'batman': ['batman', 'yarasa adam'],
  'superman': ['superman', 'süpermen'],
  'iron man': ['demir adam'],
  'demir adam': ['iron man'],
  'captain america': ['kaptan amerika'],
  'kaptan amerika': ['captain america'],
  'thor': ['thor'],
  'hulk': ['hulk', 'yeşil dev'],
  'avengers': ['yenilmezler'],
  'yenilmezler': ['avengers', 'the avengers'],
  'justice league': ['adalet birliği'],
  'adalet birliği': ['justice league'],
  'wonder woman': ['wonder woman', 'mucize kadın'],
  'aquaman': ['aquaman', 'su adam'],
  'joker': ['joker'],
  'deadpool': ['deadpool', 'ölümsüz'],
  'x-men': ['x-men'],
  'transformers': ['transformers', 'dönüşenler'],
  'pirates of the caribbean': ['karayip korsanları'],
  'karayip korsanları': ['pirates of the caribbean'],
  'harry potter': ['harry potter'],
  'john wick': ['john wick'],
  'mission impossible': ['görevimiz tehlike'],
  'görevimiz tehlike': ['mission impossible'],
  'top gun': ['top gun'],
  'jurassic park': ['jurassic park', 'jurasik park'],
  'jurassic world': ['jurassic world', 'jurasik dünya'],
  'star wars': ['yıldız savaşları'],
  'yıldız savaşları': ['star wars'],
  'the terminator': ['terminatör'],
  'terminatör': ['terminator', 'the terminator'],
  'alien': ['yaratık'],
  'yaratık': ['alien'],
  'predator': ['av', 'predator'],
  'die hard': ['zor ölüm'],
  'zor ölüm': ['die hard'],
  'rambo': ['rambo'],
  'rocky': ['rocky'],
  'creed': ['creed'],
  'the expendables': ['cehennem melekleri'],
  'cehennem melekleri': ['the expendables', 'expendables'],
  'mad max': ['mad max', 'çılgın max'],
  'dune': ['dune', 'kumul'],
  'blade runner': ['bıçak sırtı'],
  'bıçak sırtı': ['blade runner'],
};

// Arama terimini genişlet (Türkçe-İngilizce çeviri dahil)
export const expandSearchTerms = (query: string): string[] => {
  const normalizedQuery = query.toLowerCase().trim();
  const terms: string[] = [normalizedQuery];
  
  // Eşleştirmeleri kontrol et
  for (const [key, values] of Object.entries(movieTranslations)) {
    // Anahtar kelime aramayla eşleşiyor mu?
    if (normalizedQuery.includes(normalizeTurkish(key)) || 
        normalizeTurkish(normalizedQuery).includes(normalizeTurkish(key))) {
      terms.push(...values);
    }
    
    // Değerlerden biri aramayla eşleşiyor mu?
    for (const value of values) {
      if (normalizedQuery.includes(normalizeTurkish(value)) || 
          normalizeTurkish(normalizedQuery).includes(normalizeTurkish(value))) {
        terms.push(key);
      }
    }
  }
  
  return [...new Set(terms)]; // Tekrarları kaldır
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
  
  return false;
};
