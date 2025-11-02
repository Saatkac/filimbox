import { useState, useEffect, useMemo, useCallback } from "react";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Play, TrendingUp } from "lucide-react";
import { categories } from "@/data/categories";

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [movies, setMovies] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 30;
  
  const loadContent = useCallback(async (pageNum: number) => {
    setLoading(true);
    const from = (pageNum - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    const [moviesData, seriesData] = await Promise.all([
      supabase
        .from("movies")
        .select("id,title,poster_url,backdrop_url,rating,year,category,description,duration")
        .order("created_at", { ascending: false })
        .range(from, to),
      supabase
        .from("series")
        .select("id,title,poster_url,backdrop_url,rating,year,category,description")
        .order("created_at", { ascending: false })
        .range(from, to),
    ]);
    
    const newMovies = moviesData.data || [];
    const newSeries = seriesData.data || [];
    
    if (pageNum === 1) {
      setMovies(newMovies);
      setSeries(newSeries);
    } else {
      setMovies(prev => [...prev, ...newMovies]);
      setSeries(prev => [...prev, ...newSeries]);
    }
    
    setHasMore(newMovies.length + newSeries.length === ITEMS_PER_PAGE);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadContent(1);
  }, []);

  const allContent = useMemo(() => 
    [...movies, ...series.map(s => ({ ...s, isSeries: true }))],
    [movies, series]
  );
  
  const filteredContent = useMemo(() => 
    selectedCategory === "Tümü" 
      ? allContent 
      : allContent.filter(item => item.category === selectedCategory),
    [selectedCategory, allContent]
  );

  const featuredContent = useMemo(() => allContent[0], [allContent]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cinema-dark">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gold text-xl">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinema-dark">
      <Navbar />
      
      {featuredContent && (
        <section className="relative h-[70vh] mt-16">
          <div className="absolute inset-0">
            <img
              src={featuredContent.backdrop_url || featuredContent.poster_url || "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1920&h=1080&fit=crop"}
              alt={featuredContent.title}
              loading="eager"
              fetchPriority="high"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-cinema-dark via-cinema-dark/80 to-transparent" />
          </div>
          
          <div className="relative container mx-auto px-4 h-full flex items-center">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-gold mb-4">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase">Öne Çıkan</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-4 gold-glow">
                {featuredContent.title}
              </h1>
              <p className="text-lg text-muted-foreground mb-6 max-w-xl">
                {featuredContent.description || "Harika bir içerik sizi bekliyor!"}
              </p>
              <div className="flex items-center gap-4 mb-8">
                <span className="px-3 py-1 bg-gold/20 text-gold rounded-full text-sm font-medium">
                  IMDb {featuredContent.rating}
                </span>
                <span className="text-muted-foreground">{featuredContent.year}</span>
                {featuredContent.duration && (
                  <span className="text-muted-foreground">{featuredContent.duration}</span>
                )}
              </div>
              <Button 
                size="lg" 
                className="bg-gold hover:bg-gold-light text-black font-semibold"
                onClick={() => window.location.href = `/movie/${featuredContent.id}`}
              >
                <Play className="w-5 h-5 mr-2" />
                Şimdi İzle
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-8">
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "secondary"}
              className={
                selectedCategory === category
                  ? "bg-gold hover:bg-gold-light text-black font-medium whitespace-nowrap"
                  : "whitespace-nowrap"
              }
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold mb-6">
          {selectedCategory === "Tümü" ? "Tüm İçerikler" : selectedCategory}
        </h2>
        {filteredContent.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredContent.map((item) => (
                <MovieCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  poster={item.poster_url || "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop"}
                  rating={item.rating}
                  year={item.year}
                  category={item.category}
                />
              ))}
            </div>
            
            {hasMore && !loading && (
              <div className="mt-8 text-center">
                <Button
                  onClick={() => {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    loadContent(nextPage);
                  }}
                  className="bg-gold hover:bg-gold-light text-black"
                >
                  Daha Fazla Yükle
                </Button>
              </div>
            )}
            
            {loading && page > 1 && (
              <div className="mt-8 text-center text-gold">
                Yükleniyor...
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">
              Henüz içerik eklenmedi. Admin panelinden içerik ekleyebilirsiniz.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
