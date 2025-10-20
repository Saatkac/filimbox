import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import VideoPlayer from "@/components/VideoPlayer";
import MovieCard from "@/components/MovieCard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Star, Clock, Calendar, ArrowLeft } from "lucide-react";

const MovieDetail = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState<any>(null);
  const [similarContent, setSimilarContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (id) {
      loadMovie();
    }
  }, [id]);

  const loadMovie = async () => {
    setLoading(true);
    
    // Try to load as movie first
    let { data: movieData } = await supabase
      .from("movies")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    
    // If not found, try series
    if (!movieData) {
      const { data: seriesData } = await supabase
        .from("series")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      movieData = seriesData;
    }
    
    setMovie(movieData);
    
    if (movieData) {
      // Load similar content
      const { data: moviesData } = await supabase
        .from("movies")
        .select("*")
        .eq("category", movieData.category)
        .neq("id", id)
        .limit(4);
      
      const { data: seriesData } = await supabase
        .from("series")
        .select("*")
        .eq("category", movieData.category)
        .neq("id", id)
        .limit(4);
      
      setSimilarContent([...(moviesData || []), ...(seriesData || [])].slice(0, 4));
    }
    
    setLoading(false);
  };

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

  if (!movie) {
    return (
      <div className="min-h-screen bg-cinema-dark">
        <Navbar />
        <div className="container mx-auto px-4 pt-32 text-center">
          <h1 className="text-3xl font-bold mb-4">İçerik bulunamadı</h1>
          <Link to="/">
            <Button variant="default" className="bg-gold hover:bg-gold-light text-black">
              Ana Sayfaya Dön
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinema-dark">
      <Navbar />
      
      <div className="pt-20">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost" className="text-gold hover:text-gold-light">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
          </Link>
        </div>

        {movie.video_url ? (
          <div className="container mx-auto px-4 mb-8">
            <VideoPlayer 
              src={movie.video_url} 
              poster={movie.backdrop_url || movie.poster_url} 
            />
          </div>
        ) : (
          <div className="container mx-auto px-4 mb-8 text-center py-8 bg-card rounded-lg">
            <p className="text-muted-foreground">Bu içerik için video henüz eklenmedi</p>
          </div>
        )}

        <div className="container mx-auto px-4 mb-12">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3">
              <img
                src={movie.poster_url || "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop"}
                alt={movie.title}
                className="w-full rounded-lg shadow-2xl"
              />
            </div>
            
            <div className="md:w-2/3">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 gold-glow">
                {movie.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg">
                  <Star className="w-5 h-5 fill-gold text-gold" />
                  <span className="text-lg font-semibold">{movie.rating}</span>
                  <span className="text-muted-foreground">IMDb</span>
                </div>
                
                {movie.year && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{movie.year}</span>
                  </div>
                )}
                
                {movie.duration && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{movie.duration}</span>
                  </div>
                )}
                
                <span className="px-3 py-1 bg-gold/20 text-gold rounded-full text-sm font-medium">
                  {movie.category}
                </span>
              </div>
              
              {movie.description && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-3">Hikaye</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {movie.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {similarContent.length > 0 && (
          <div className="container mx-auto px-4 pb-16">
            <h2 className="text-2xl font-bold mb-6">Benzer İçerikler</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {similarContent.map((item) => (
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
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDetail;
