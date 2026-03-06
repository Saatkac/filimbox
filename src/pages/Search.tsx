import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { advancedMatch, normalizeTurkish, removeSpacesAndSpecialChars, generateSearchVariants, getTranslations } from "@/utils/searchUtils";

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const lastQueryRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    if (lastQueryRef.current === query && results.length > 0) {
      setLoading(false);
      return;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    const searchContent = async () => {
      if (!query.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      lastQueryRef.current = query;
      
      try {
        const trimmedQuery = query.trim();
        const normalizedQuery = normalizeTurkish(trimmedQuery);
        const queryNoSpaces = removeSpacesAndSpecialChars(normalizedQuery);
        const searchVariants = generateSearchVariants(trimmedQuery);
        
        if (!searchVariants.includes(normalizedQuery)) {
          searchVariants.push(normalizedQuery);
        }
        if (!searchVariants.includes(queryNoSpaces)) {
          searchVariants.push(queryNoSpaces);
        }
        
        // Add bilingual translations
        const words = trimmedQuery.split(/\s+/);
        for (const word of words) {
          const translations = getTranslations(word);
          for (const translation of translations) {
            if (!searchVariants.includes(translation)) {
              searchVariants.push(translation);
            }
            const normalizedTranslation = normalizeTurkish(translation);
            if (!searchVariants.includes(normalizedTranslation)) {
              searchVariants.push(normalizedTranslation);
            }
          }
        }
        
        const orConditions = [...new Set(searchVariants)]
          .map(v => `title.ilike.%${v}%,description.ilike.%${v}%`)
          .join(',');
        
        const [moviesData, seriesData] = await Promise.all([
          supabase
            .from("movies")
            .select("*")
            .or(orConditions)
            .limit(500),
          supabase
            .from("series")
            .select("*")
            .or(orConditions)
            .limit(100),
        ]);
        
        if (controller.signal.aborted) return;
        
        const allMovies = (moviesData.data || []).map(m => ({ ...m, contentType: 'movie' }));
        const allSeries = (seriesData.data || []).map(s => ({ ...s, contentType: 'series' }));
        let allContent = [...allMovies, ...allSeries];
        
        // Client-side advanced matching
        const allSearchTerms = [trimmedQuery, ...searchVariants];
        allContent = allContent.filter(item => {
          const title = item.title || '';
          const description = item.description || '';
          return allSearchTerms.some(term => 
            advancedMatch(title, term) || advancedMatch(description, term)
          );
        });
        
        // Sort results
        allContent.sort((a, b) => {
          const aTitle = normalizeTurkish(a.title || '');
          const bTitle = normalizeTurkish(b.title || '');
          const queryNorm = normalizeTurkish(trimmedQuery);
          const queryNormNoSpaces = removeSpacesAndSpecialChars(queryNorm);
          
          const aExact = aTitle === queryNorm || removeSpacesAndSpecialChars(aTitle) === queryNormNoSpaces;
          const bExact = bTitle === queryNorm || removeSpacesAndSpecialChars(bTitle) === queryNormNoSpaces;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          const aStarts = aTitle.startsWith(queryNorm) || removeSpacesAndSpecialChars(aTitle).startsWith(queryNormNoSpaces);
          const bStarts = bTitle.startsWith(queryNorm) || removeSpacesAndSpecialChars(bTitle).startsWith(queryNormNoSpaces);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          
          const aContains = aTitle.includes(queryNorm);
          const bContains = bTitle.includes(queryNorm);
          if (aContains && !bContains) return -1;
          if (!aContains && bContains) return 1;
          
          return 0;
        });
        
        setResults(allContent);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    
    searchContent();
    
    return () => {
      controller.abort();
    };
  }, [query]);

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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <SearchIcon className="w-8 h-8 text-gold" />
            <h1 className="text-3xl sm:text-4xl font-bold">
              Arama Sonuçları
            </h1>
          </div>
          <p className="text-muted-foreground">
            "<span className="text-gold">{query}</span>" için {results.length} sonuç bulundu
          </p>
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
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
