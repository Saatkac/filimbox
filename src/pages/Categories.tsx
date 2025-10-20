import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { supabase } from "@/integrations/supabase/client";
import { categories } from "@/data/categories";
import { Film } from "lucide-react";

const Categories = () => {
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [movies, setMovies] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    const [moviesData, seriesData] = await Promise.all([
      supabase.from("movies").select("*"),
      supabase.from("series").select("*"),
    ]);
    
    setMovies(moviesData.data || []);
    setSeries(seriesData.data || []);
    setLoading(false);
  };

  const allContent = [...movies, ...series];
  
  const filteredContent = selectedCategory === "Tümü" 
    ? allContent 
    : allContent.filter(item => item.category === selectedCategory);

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
      
      <div className="container mx-auto px-4 pt-32 pb-16">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Film className="w-8 h-8 text-gold" />
            <h1 className="text-4xl font-bold gold-glow">Kategoriler</h1>
          </div>
          <p className="text-muted-foreground">
            Favori türünüzdeki filmleri keşfedin
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
          {categories.map((category) => {
            const count = category === "Tümü" 
              ? allContent.length 
              : allContent.filter(item => item.category === category).length;
            
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`
                  p-6 rounded-lg text-center font-semibold transition-all duration-300
                  ${selectedCategory === category
                    ? 'bg-gold text-black shadow-lg shadow-gold/50 scale-105'
                    : 'bg-card hover:bg-secondary text-foreground hover:scale-105'
                  }
                `}
              >
                {category}
                <div className="mt-2 text-sm opacity-70">
                  {count} içerik
                </div>
              </button>
            );
          })}
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">
            {selectedCategory === "Tümü" ? "Tüm İçerikler" : selectedCategory}
            <span className="text-muted-foreground ml-3 text-lg">
              ({filteredContent.length} içerik)
            </span>
          </h2>
          
          {filteredContent.length > 0 ? (
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
          ) : (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground">
                Bu kategoride henüz içerik yok.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categories;
