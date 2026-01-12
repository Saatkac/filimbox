import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon, Loader2, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categories } from "@/data/categories";

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const lastQueryRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
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
        // Sorguyu hazırla
        const searchTerm = `%${query.trim()}%`;
        
        // Supabase'de ILIKE ile arama yap
        const [moviesData, seriesData] = await Promise.all([
          supabase
            .from("movies")
            .select("*")
            .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm}`)
            .limit(500),
          supabase
            .from("series")
            .select("*")
            .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm}`)
            .limit(100),
        ]);
        
        // İptal edildiyse sonuçları güncelleme
        if (controller.signal.aborted) return;
        
        const allMovies = (moviesData.data || []).map(m => ({ ...m, contentType: 'movie' }));
        const allSeries = (seriesData.data || []).map(s => ({ ...s, contentType: 'series' }));
        const allContent = [...allMovies, ...allSeries];
        
        // Sonuçları sırala
        const queryLower = query.toLowerCase();
        allContent.sort((a, b) => {
          const aTitle = a.title?.toLowerCase() || '';
          const bTitle = b.title?.toLowerCase() || '';
          
          const aExact = aTitle === queryLower;
          const bExact = bTitle === queryLower;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          const aStarts = aTitle.startsWith(queryLower);
          const bStarts = bTitle.startsWith(queryLower);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          
          const aContains = aTitle.includes(queryLower);
          const bContains = bTitle.includes(queryLower);
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <SearchIcon className="w-8 h-8 text-gold" />
              <h1 className="text-3xl sm:text-4xl font-bold">
                Arama Sonuçları
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={hasActiveFilters ? "border-gold text-gold" : ""}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtrele
              {hasActiveFilters && (
                <span className="ml-2 w-2 h-2 bg-gold rounded-full" />
              )}
            </Button>
          </div>
          <p className="text-muted-foreground">
            "<span className="text-gold">{query}</span>" için {filteredResults.length} sonuç bulundu
            {hasActiveFilters && ` (toplam ${results.length})`}
          </p>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-8 p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Filtreler</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Temizle
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Kategori</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    {categories.filter(c => c !== "Tümü").map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Yıl</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    {yearOptions.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Min. IMDb</label>
                <Select value={selectedRating} onValueChange={setSelectedRating}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="9">9+</SelectItem>
                    <SelectItem value="8">8+</SelectItem>
                    <SelectItem value="7">7+</SelectItem>
                    <SelectItem value="6">6+</SelectItem>
                    <SelectItem value="5">5+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Sıralama</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="İlgililik" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">İlgililik</SelectItem>
                    <SelectItem value="rating">IMDb Puanı</SelectItem>
                    <SelectItem value="year">Yıl</SelectItem>
                    <SelectItem value="title">İsim (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

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
