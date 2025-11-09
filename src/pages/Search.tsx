import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon } from "lucide-react";

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    searchContent();
  }, [query]);

  const searchContent = async () => {
    setLoading(true);
    
    const searchQuery = `%${query.toLowerCase()}%`;
    
    const [moviesData, seriesData] = await Promise.all([
      supabase
        .from("movies")
        .select("*")
        .or(`title.ilike.${searchQuery},description.ilike.${searchQuery},category.ilike.${searchQuery}`),
      supabase
        .from("series")
        .select("*")
        .or(`title.ilike.${searchQuery},description.ilike.${searchQuery},category.ilike.${searchQuery}`),
    ]);
    
    setResults([...(moviesData.data || []), ...(seriesData.data || [])]);
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
