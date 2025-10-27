import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";

const Favorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("favorites")
      .select(`
        id,
        movie_id,
        series_id,
        movies (id, title, poster_url, rating, year, category),
        series (id, title, poster_url, rating, year, category)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const favList = data.map((fav: any) => {
        if (fav.movies) {
          return { ...fav.movies, type: "movie" };
        } else if (fav.series) {
          return { ...fav.series, type: "series" };
        }
        return null;
      }).filter(Boolean);
      
      setFavorites(favList);
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-cinema-dark">
        <Navbar />
        <div className="container mx-auto px-4 pt-32 text-center">
          <h1 className="text-3xl font-bold mb-4">Favorilerinizi görmek için giriş yapın</h1>
          <Link to="/auth">
            <Button className="bg-gold hover:bg-gold-light text-black">Giriş Yap</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinema-dark">
      <Navbar />
      <div className="container mx-auto px-4 pt-32 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-8 h-8 text-gold fill-gold" />
          <h1 className="text-4xl font-bold text-gold gold-glow">Favorilerim</h1>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gold text-xl">Yükleniyor...</div>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">Henüz favori eklemediniz</p>
            <Link to="/">
              <Button className="bg-gold hover:bg-gold-light text-black">İçerikleri Keşfet</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {favorites.map((item) => (
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
        )}
      </div>
    </div>
  );
};

export default Favorites;
