import { useState } from "react";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { movies, categories } from "@/data/movies";
import { Film } from "lucide-react";

const Categories = () => {
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  
  const filteredMovies = selectedCategory === "Tümü" 
    ? movies 
    : movies.filter(movie => movie.category === selectedCategory);

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

        {/* Category Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
          {categories.map((category) => (
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
                {movies.filter(m => category === "Tümü" || m.category === category).length} film
              </div>
            </button>
          ))}
        </div>

        {/* Movies Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6">
            {selectedCategory === "Tümü" ? "Tüm Filmler" : selectedCategory}
            <span className="text-muted-foreground ml-3 text-lg">
              ({filteredMovies.length} film)
            </span>
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                poster={movie.poster}
                rating={movie.rating}
                year={movie.year}
                category={movie.category}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;
