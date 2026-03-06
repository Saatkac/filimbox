import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon, Loader2, X } from "lucide-react";
import { advancedMatch, normalizeTurkish, removeSpacesAndSpecialChars, generateSearchVariants, getTranslations } from "@/utils/searchUtils";

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const lastQueryRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Filters - always visible now
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedRating, setSelectedRating] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("relevance");
  
  // Generate year options (last 50 years)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    for (let year = currentYear; year >= currentYear - 50; year--) {
      years.push(year.toString());
    }
    return years;
  }, []);
  
  useEffect(() => {
    // Aynı sorgu için tekrar arama yapma
    if (lastQueryRef.current === query && results.length > 0) {
      setLoading(false);
      return;
    }
    
    // Önceki isteği iptal et
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
        
        // Normalize query for Turkish chars
        const normalizedQuery = normalizeTurkish(trimmedQuery);
        const queryNoSpaces = removeSpacesAndSpecialChars(normalizedQuery);
        
        // Generate search variants using utility function
        const searchVariants = generateSearchVariants(trimmedQuery);
        
        // Also add ASCII normalized version
        if (!searchVariants.includes(normalizedQuery)) {
          searchVariants.push(normalizedQuery);
        }
        if (!searchVariants.includes(queryNoSpaces)) {
          searchVariants.push(queryNoSpaces);
        }
        
        // Add bilingual translations (English <-> Turkish)
        const words = trimmedQuery.split(/\s+/);
        for (const word of words) {
          const translations = getTranslations(word);
          for (const translation of translations) {
            if (!searchVariants.includes(translation)) {
              searchVariants.push(translation);
            }
            // Also add normalized version of translation
            const normalizedTranslation = normalizeTurkish(translation);
            if (!searchVariants.includes(normalizedTranslation)) {
              searchVariants.push(normalizedTranslation);
            }
          }
        }
        
        // Build OR conditions for each variant
        const orConditions = [...new Set(searchVariants)]
          .map(v => `title.ilike.%${v}%,description.ilike.%${v}%`)
          .join(',');
        
        // Supabase'de ILIKE ile arama yap
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
        
        // İptal edildiyse sonuçları güncelleme
        if (controller.signal.aborted) return;
        
        const allMovies = (moviesData.data || []).map(m => ({ ...m, contentType: 'movie' }));
        const allSeries = (seriesData.data || []).map(s => ({ ...s, contentType: 'series' }));
        let allContent = [...allMovies, ...allSeries];
        
        // Client-side advanced matching for better Turkish support
        // Include translations in the matching
        const allSearchTerms = [trimmedQuery, ...searchVariants];
        allContent = allContent.filter(item => {
          const title = item.title || '';
          const description = item.description || '';
          return allSearchTerms.some(term => 
            advancedMatch(title, term) || advancedMatch(description, term)
          );
        });
        
        // Sonuçları sırala - normalize edilmiş karşılaştırma ile
        allContent.sort((a, b) => {
          const aTitle = normalizeTurkish(a.title || '');
          const bTitle = normalizeTurkish(b.title || '');
          const queryNorm = normalizeTurkish(trimmedQuery);
          const queryNormNoSpaces = removeSpacesAndSpecialChars(queryNorm);
          
          // Exact match
          const aExact = aTitle === queryNorm || removeSpacesAndSpecialChars(aTitle) === queryNormNoSpaces;
          const bExact = bTitle === queryNorm || removeSpacesAndSpecialChars(bTitle) === queryNormNoSpaces;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          // Starts with
          const aStarts = aTitle.startsWith(queryNorm) || removeSpacesAndSpecialChars(aTitle).startsWith(queryNormNoSpaces);
          const bStarts = bTitle.startsWith(queryNorm) || removeSpacesAndSpecialChars(bTitle).startsWith(queryNormNoSpaces);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          
          // Contains
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
  
  // Filtered and sorted results
  const filteredResults = useMemo(() => {
    let filtered = [...results];
    
    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    // Year filter
    if (selectedYear !== "all") {
      filtered = filtered.filter(item => item.year?.toString() === selectedYear);
    }
    
    // Rating filter
    if (selectedRating !== "all") {
      const minRating = parseFloat(selectedRating);
      filtered = filtered.filter(item => (item.rating || 0) >= minRating);
    }
    
    // Sorting
    if (sortBy === "rating") {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "year") {
      filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sortBy === "title") {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr'));
    }
    
    return filtered;
  }, [results, selectedCategory, selectedYear, selectedRating, sortBy]);
  
  const clearFilters = useCallback(() => {
    setSelectedCategory("all");
    setSelectedYear("all");
    setSelectedRating("all");
    setSortBy("relevance");
  }, []);
  
  const hasActiveFilters = selectedCategory !== "all" || selectedYear !== "all" || selectedRating !== "all" || sortBy !== "relevance";
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
            "<span className="text-gold">{query}</span>" için {filteredResults.length} sonuç bulundu
            {hasActiveFilters && ` (toplam ${results.length})`}
          </p>
        </div>

        {filteredResults.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {filteredResults.map((item) => (
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
              Farklı anahtar kelimeler deneyin veya filtreleri değiştirin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;