import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon, Globe } from "lucide-react";
import { expandSearchTerms, advancedMatch } from "@/utils/searchUtils";

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  
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
    
    // Arama terimlerini genişlet (Türkçe-İngilizce çeviri dahil)
    const expandedTerms = expandSearchTerms(query);
    setSearchTerms(expandedTerms);
    
    // Tüm filmler ve dizileri çek
    const [moviesData, seriesData] = await Promise.all([
      supabase.from("movies").select("*"),
      supabase.from("series").select("*"),
    ]);
    
    const allMovies = moviesData.data || [];
    const allSeries = seriesData.data || [];
    const allContent = [...allMovies, ...allSeries];
    
    // Gelişmiş filtreleme
    const filteredResults = allContent.filter(item => {
      // Her genişletilmiş terim için kontrol et
      return expandedTerms.some(term => {
        return advancedMatch(item.title, term) ||
               advancedMatch(item.description || '', term) ||
               advancedMatch(item.category || '', term);
      });
    });
    
    // Sonuçları sırala - tam eşleşmeler önce
    filteredResults.sort((a, b) => {
      const aExactMatch = a.title.toLowerCase().includes(query.toLowerCase());
      const bExactMatch = b.title.toLowerCase().includes(query.toLowerCase());
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
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
          <div className="text-gold text-xl">Aranıyor...</div>
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
          
          {/* Genişletilmiş arama terimleri gösterimi */}
          {searchTerms.length > 1 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Ayrıca arandı:</span>
              {searchTerms.slice(1).map((term, index) => (
                <span 
                  key={index}
                  className="text-sm px-2 py-1 bg-primary/10 text-primary rounded-md"
                >
                  {term}
                </span>
              ))}
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
