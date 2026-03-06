import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Play, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [featuredContent, setFeaturedContent] = useState<any>(null);
  const ITEMS_PER_PAGE = 30;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  
  // Load featured content
  const loadFeaturedContent = useCallback(async () => {
    const { data: featured } = await supabase
      .from("featured_content")
      .select("*, movies(*), series(*)")
      .maybeSingle();

    if (featured?.movies) {
      setFeaturedContent(featured.movies);
    } else if (featured?.series) {
      setFeaturedContent(featured.series);
    } else {
      // Default to latest movie
      const { data: latestMovie } = await supabase
        .from("movies")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      setFeaturedContent(latestMovie);
    }
  }, []);
  
  const loadContent = useCallback(async (pageNum: number) => {
    if (pageNum === 1) setLoading(true); else setLoadingMore(true);
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
    
    setHasMore(newMovies.length === ITEMS_PER_PAGE);
    if (pageNum === 1) setLoading(false); else setLoadingMore(false);
  }, []);

  useEffect(() => {
    loadFeaturedContent();
    loadContent(1);
  }, [loadContent, loadFeaturedContent]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && hasMore && !loading && !loadingMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        loadContent(nextPage);
      }
    }, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, loadContent]);

  const allContent = useMemo(() => [...movies, ...series], [movies, series]);
  
  const filteredContent = useMemo(() => allContent, [allContent]);

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
        <section className="relative h-[50vh] sm:h-[60vh] md:h-[70vh] mt-14 sm:mt-16">
          <div className="absolute inset-0">
            <img
              src={featuredContent.backdrop_url || featuredContent.poster_url || "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1920&h=1080&fit=crop"}
              alt={featuredContent.title}
              loading="eager"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-cinema-dark via-cinema-dark/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-cinema-dark via-transparent to-transparent md:hidden" />
          </div>
          
          <div className="relative container mx-auto px-4 h-full flex items-end pb-8 sm:items-center sm:pb-0">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-gold mb-2 sm:mb-4">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm font-semibold uppercase">Öne Çıkan</span>
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-2 sm:mb-4 gold-glow line-clamp-2">
                {featuredContent.title}
              </h1>
              <p className="text-sm sm:text-lg text-muted-foreground mb-3 sm:mb-6 max-w-xl line-clamp-2 sm:line-clamp-3">
                {featuredContent.description || "Harika bir içerik sizi bekliyor!"}
              </p>
              <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-8 flex-wrap">
                <span className="px-2 sm:px-3 py-1 bg-gold/20 text-gold rounded-full text-xs sm:text-sm font-medium">
                  IMDb {featuredContent.rating}
                </span>
                <span className="text-muted-foreground text-xs sm:text-base">{featuredContent.year}</span>
                {featuredContent.duration && (
                  <span className="text-muted-foreground text-xs sm:text-base">{featuredContent.duration}</span>
                )}
              </div>
              <Button 
                size="default"
                className="bg-gold hover:bg-gold-light text-black font-semibold w-full sm:w-auto touch-manipulation active:scale-95 transition-transform"
                onClick={() => navigate(`/movie/${featuredContent.id}`)}
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Şimdi İzle
              </Button>
            </div>
          </div>
        </section>
      )}


      <section className="container mx-auto px-3 sm:px-4 pb-16 pt-4 sm:pt-0">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Tüm Filmler</h2>
        {filteredContent.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
              {filteredContent.map((item) => (
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
            
            <div ref={loadMoreRef} className="h-10" />
            {loadingMore && (
              <div className="mt-6 text-center text-gold">Yükleniyor...</div>
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
