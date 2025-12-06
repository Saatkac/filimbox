import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon, Globe, Loader2 } from "lucide-react";
import { advancedMatch, detectLanguage, translateText, normalizeTurkish } from "@/utils/searchUtils";

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [translatedQuery, setTranslatedQuery] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  
  useEffect(() => {
    searchContent();
  }, [query]);

  const searchContent = async () => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setTranslatedQuery(null);
    
    // Tüm filmler ve dizileri çek
    const [moviesData, seriesData] = await Promise.all([
      supabase.from("movies").select("*"),
      supabase.from("series").select("*"),
    ]);
    
    const allMovies = moviesData.data || [];
    const allSeries = seriesData.data || [];
    const allContent = [...allMovies, ...allSeries];
    
    // İlk arama - orijinal sorgu ile
    let filteredResults = allContent.filter(item => {
      return advancedMatch(item.title, query) ||
             advancedMatch(item.description || '', query) ||
             advancedMatch(item.category || '', query);
    });
    
    // Sonuç yoksa veya az ise çeviri yap
    if (filteredResults.length < 3 && query.length >= 2) {
      setIsTranslating(true);
      
      // Dil algıla ve çevir
      const detectedLang = detectLanguage(query);
      const targetLang = detectedLang === 'tr' ? 'en' : 'tr';
      
      const translated = await translateText(query, detectedLang, targetLang);
      
      if (translated && translated.toLowerCase() !== query.toLowerCase()) {
        setTranslatedQuery(translated);
        
        // Çevrilmiş sorgu ile de ara
        const translatedResults = allContent.filter(item => {
          return advancedMatch(item.title, translated) ||
                 advancedMatch(item.description || '', translated) ||
                 advancedMatch(item.category || '', translated);
        });
        
        // Sonuçları birleştir (tekrarları kaldır)
        const existingIds = new Set(filteredResults.map(r => r.id));
        translatedResults.forEach(item => {
          if (!existingIds.has(item.id)) {
            filteredResults.push(item);
          }
        });
      }
      
      setIsTranslating(false);
    }
    
    // Sonuçları sırala - tam eşleşmeler önce
    filteredResults.sort((a, b) => {
      const normalizedQuery = normalizeTurkish(query);
      const aTitle = normalizeTurkish(a.title);
      const bTitle = normalizeTurkish(b.title);
      
      // Tam başlık eşleşmesi
      const aExact = aTitle === normalizedQuery;
      const bExact = bTitle === normalizedQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Başlık içinde geçme
      const aContains = aTitle.includes(normalizedQuery);
      const bContains = bTitle.includes(normalizedQuery);
      if (aContains && !bContains) return -1;
      if (!aContains && bContains) return 1;
      
      // Başlığın başında geçme
      const aStarts = aTitle.startsWith(normalizedQuery);
      const bStarts = bTitle.startsWith(normalizedQuery);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return 0;
    });
    
    setResults(filteredResults);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cinema-dark">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center gap-3 text-gold text-xl">
            <Loader2 className="w-6 h-6 animate-spin" />
            Aranıyor...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinema-dark">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-32 pb-16">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <SearchIcon className="w-8 h-8 text-gold" />
            <h1 className="text-4xl font-bold">
              Arama Sonuçları
            </h1>
          </div>
          <p className="text-muted-foreground">
            "<span className="text-gold">{query}</span>" için {results.length} sonuç bulundu
          </p>
          
          {/* Çeviri gösterimi */}
          {isTranslating && (
            <div className="mt-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Çeviri yapılıyor...</span>
            </div>
          )}
          
          {translatedQuery && !isTranslating && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Ayrıca arandı:</span>
              <span className="text-sm px-2 py-1 bg-primary/10 text-primary rounded-md">
                {translatedQuery}
              </span>
            </div>
          )}
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {results.map((item) => (
              <MovieCard
                key={item.id}
                id={item.id}
                title={item.title}
                poster={item.poster_url || "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop"}
                rating={item.rating}
                year={item.year}
                category={item.category}
                duration={item.duration}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">
              Aramanıza uygun içerik bulunamadı.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Farklı anahtar kelimeler veya İngilizce/Türkçe karşılığını deneyin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;