// Common English-Turkish word translations for bilingual search
const translationMap: Record<string, string[]> = {
  // English to Turkish
  'love': ['aşk', 'sevgi'],
  'war': ['savaş'],
  'peace': ['barış'],
  'action': ['aksiyon'],
  'comedy': ['komedi'],
  'drama': ['dram'],
  'horror': ['korku'],
  'thriller': ['gerilim'],
  'adventure': ['macera'],
  'animation': ['animasyon'],
  'documentary': ['belgesel'],
  'fantasy': ['fantastik', 'fantezi'],
  'romance': ['romantik', 'aşk'],
  'science': ['bilim'],
  'fiction': ['kurgu'],
  'family': ['aile'],
  'crime': ['suç'],
  'mystery': ['gizem'],
  'history': ['tarih'],
  'music': ['müzik'],
  'sport': ['spor'],
  'western': ['kovboy', 'western'],
  'biography': ['biyografi'],
  'dark': ['karanlık'],
  'light': ['ışık', 'aydınlık'],
  'night': ['gece'],
  'day': ['gün'],
  'moon': ['ay'],
  'sun': ['güneş'],
  'star': ['yıldız'],
  'death': ['ölüm'],
  'life': ['hayat', 'yaşam'],
  'dream': ['rüya', 'hayal'],
  'king': ['kral'],
  'queen': ['kraliçe'],
  'prince': ['prens'],
  'princess': ['prenses'],
  'hero': ['kahraman'],
  'friend': ['arkadaş', 'dost'],
  'enemy': ['düşman'],
  'blood': ['kan'],
  'fire': ['ateş'],
  'water': ['su'],
  'world': ['dünya'],
  'sky': ['gökyüzü'],
  'time': ['zaman'],
  'space': ['uzay'],
  'game': ['oyun'],
  'home': ['ev', 'yuva'],
  'house': ['ev'],
  'city': ['şehir'],
  'man': ['adam', 'erkek'],
  'woman': ['kadın'],
  'boy': ['oğlan', 'çocuk'],
  'girl': ['kız'],
  'child': ['çocuk'],
  'father': ['baba'],
  'mother': ['anne'],
  'brother': ['kardeş', 'abi'],
  'sister': ['kardeş', 'abla'],
  'island': ['ada'],
  'mountain': ['dağ'],
  'sea': ['deniz'],
  'ocean': ['okyanus'],
  'forest': ['orman'],
  'winter': ['kış'],
  'summer': ['yaz'],
  'spring': ['bahar'],
  'revenge': ['intikam'],
  'justice': ['adalet'],
  'truth': ['gerçek'],
  'secret': ['sır', 'gizli'],
  'magic': ['sihir', 'büyü'],
  'power': ['güç'],
  'shadow': ['gölge'],
  'ghost': ['hayalet'],
  'devil': ['şeytan'],
  'angel': ['melek'],
  'soul': ['ruh'],
  'heart': ['kalp'],
  'wolf': ['kurt'],
  'lion': ['aslan'],
  'dragon': ['ejderha'],
  'monster': ['canavar'],
  'vampire': ['vampir'],
  'witch': ['cadı'],
  'warrior': ['savaşçı'],
  'knight': ['şövalye'],
  'soldier': ['asker'],
  'empire': ['imparatorluk'],
  'kingdom': ['krallık'],
  'castle': ['kale', 'şato'],
  'tower': ['kule'],
  'journey': ['yolculuk'],
  'escape': ['kaçış'],
  'fight': ['dövüş', 'kavga'],
  'battle': ['savaş'],
  'spy': ['casus'],
  'detective': ['dedektif'],
  'police': ['polis'],
  'thief': ['hırsız'],
  'doctor': ['doktor'],
  'school': ['okul'],
  'teacher': ['öğretmen'],
  'book': ['kitap'],
  'story': ['hikaye'],
  'legend': ['efsane'],
  'song': ['şarkı'],
  'happy': ['mutlu'],
  'sad': ['üzgün'],
  'brave': ['cesur'],
  'strong': ['güçlü'],
  'fast': ['hızlı'],
  'big': ['büyük'],
  'small': ['küçük'],
  'old': ['eski', 'yaşlı'],
  'new': ['yeni'],
  'young': ['genç'],
  'first': ['ilk'],
  'last': ['son'],
  'final': ['final', 'son'],
  'end': ['son'],
  'return': ['dönüş'],
  'lost': ['kayıp'],
  'dead': ['ölü'],
  'alive': ['canlı'],
  'twilight': ['alacakaranlık'],
  'snow': ['kar'],
  'rain': ['yağmur'],
  'storm': ['fırtına'],
  'wind': ['rüzgar'],
  // Turkish to English
  'aşk': ['love'],
  'savaş': ['war'],
  'barış': ['peace'],
  'aksiyon': ['action'],
  'komedi': ['comedy'],
  'dram': ['drama'],
  'korku': ['horror'],
  'gerilim': ['thriller'],
  'macera': ['adventure'],
  'animasyon': ['animation'],
  'belgesel': ['documentary'],
  'fantastik': ['fantasy'],
  'romantik': ['romance'],
  'bilim': ['science'],
  'kurgu': ['fiction'],
  'aile': ['family'],
  'suç': ['crime'],
  'gizem': ['mystery'],
  'tarih': ['history'],
  'müzik': ['music'],
  'spor': ['sport'],
  'biyografi': ['biography'],
  'karanlık': ['dark'],
  'gece': ['night'],
  'gün': ['day'],
  'ay': ['moon'],
  'güneş': ['sun'],
  'yıldız': ['star'],
  'ölüm': ['death'],
  'hayat': ['life'],
  'rüya': ['dream'],
  'hayal': ['dream'],
  'kral': ['king'],
  'kraliçe': ['queen'],
  'prens': ['prince'],
  'prenses': ['princess'],
  'kahraman': ['hero'],
  'arkadaş': ['friend'],
  'düşman': ['enemy'],
  'kan': ['blood'],
  'ateş': ['fire'],
  'su': ['water'],
  'dünya': ['world'],
  'gökyüzü': ['sky'],
  'zaman': ['time'],
  'uzay': ['space'],
  'oyun': ['game'],
  'ev': ['home', 'house'],
  'şehir': ['city'],
  'adam': ['man'],
  'kadın': ['woman'],
  'çocuk': ['child'],
  'baba': ['father'],
  'anne': ['mother'],
  'ada': ['island'],
  'dağ': ['mountain'],
  'deniz': ['sea'],
  'okyanus': ['ocean'],
  'orman': ['forest'],
  'kış': ['winter'],
  'yaz': ['summer'],
  'bahar': ['spring'],
  'intikam': ['revenge'],
  'adalet': ['justice'],
  'gerçek': ['truth'],
  'sır': ['secret'],
  'sihir': ['magic'],
  'güç': ['power'],
  'gölge': ['shadow'],
  'hayalet': ['ghost'],
  'şeytan': ['devil'],
  'melek': ['angel'],
  'ruh': ['soul'],
  'kalp': ['heart'],
  'kurt': ['wolf'],
  'aslan': ['lion'],
  'ejderha': ['dragon'],
  'canavar': ['monster'],
  'vampir': ['vampire'],
  'cadı': ['witch'],
  'savaşçı': ['warrior'],
  'şövalye': ['knight'],
  'asker': ['soldier'],
  'imparatorluk': ['empire'],
  'krallık': ['kingdom'],
  'kale': ['castle'],
  'şato': ['castle'],
  'kule': ['tower'],
  'yolculuk': ['journey'],
  'kaçış': ['escape'],
  'dövüş': ['fight'],
  'kavga': ['fight'],
  'casus': ['spy'],
  'dedektif': ['detective'],
  'polis': ['police'],
  'hırsız': ['thief'],
  'doktor': ['doctor'],
  'okul': ['school'],
  'öğretmen': ['teacher'],
  'kitap': ['book'],
  'hikaye': ['story'],
  'efsane': ['legend'],
  'şarkı': ['song'],
  'mutlu': ['happy'],
  'üzgün': ['sad'],
  'cesur': ['brave'],
  'güçlü': ['strong'],
  'hızlı': ['fast'],
  'büyük': ['big'],
  'küçük': ['small'],
  'eski': ['old'],
  'yaşlı': ['old'],
  'yeni': ['new'],
  'genç': ['young'],
  'ilk': ['first'],
  'son': ['last', 'end', 'final'],
  'dönüş': ['return'],
  'kayıp': ['lost'],
  'ölü': ['dead'],
  'canlı': ['alive'],
  'alacakaranlık': ['twilight'],
  'kar': ['snow'],
  'yağmur': ['rain'],
  'fırtına': ['storm'],
  'rüzgar': ['wind'],
};

// Get translations for a word
export const getTranslations = (word: string): string[] => {
  const lowerWord = word.toLowerCase();
  const normalizedWord = normalizeTurkish(lowerWord);
  
  // Check direct match
  if (translationMap[lowerWord]) {
    return translationMap[lowerWord];
  }
  
  // Check normalized match
  if (translationMap[normalizedWord]) {
    return translationMap[normalizedWord];
  }
  
  return [];
};

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