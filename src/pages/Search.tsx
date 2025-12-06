import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon, Loader2 } from "lucide-react";

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
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
    
    // Sorguyu hazırla - Türkçe karakterleri ve varyantları için
    const searchTerm = `%${query.trim()}%`;
    
    // Supabase'de ILIKE ile arama yap (sunucu tarafında)
    const [moviesData, seriesData] = await Promise.all([
      supabase
        .from("movies")
        .select("*")
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm}`)
        .limit(200),
      supabase
        .from("series")
        .select("*")
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm}`)
        .limit(50),
    ]);
    
    const allMovies = moviesData.data || [];
    const allSeries = seriesData.data || [];
    
    // İki sonucu birleştir
    const allContent = [...allMovies, ...allSeries];
    
    // Sonuçları sırala - başlık eşleşmeleri önce
    const queryLower = query.toLowerCase();
    allContent.sort((a, b) => {
      const aTitle = a.title?.toLowerCase() || '';
      const bTitle = b.title?.toLowerCase() || '';
      
      // Tam başlık eşleşmesi
      const aExact = aTitle === queryLower;
      const bExact = bTitle === queryLower;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Başlık ile başlama
      const aStarts = aTitle.startsWith(queryLower);
      const bStarts = bTitle.startsWith(queryLower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // Başlık içinde geçme
      const aContains = aTitle.includes(queryLower);
      const bContains = bTitle.includes(queryLower);
      if (aContains && !bContains) return -1;
      if (!aContains && bContains) return 1;
      
      return 0;
    });
    
    setResults(allContent);
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
              Farklı anahtar kelimeler deneyin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
