import { useState } from "react";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { movies, categories } from "@/data/movies";
import { Button } from "@/components/ui/button";
import { Play, TrendingUp } from "lucide-react";

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  
  const filteredMovies = selectedCategory === "Tümü" 
    ? movies 
    : movies.filter(movie => movie.category === selectedCategory);

  const featuredMovie = movies[0];

  return (
    <div className="min-h-screen bg-cinema-dark">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[70vh] mt-16">
        <div className="absolute inset-0">
          <img
            src={featuredMovie.backdrop}
            alt={featuredMovie.title}
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
              {featuredMovie.title}
            </h1>
            <p className="text-lg text-muted-foreground mb-6 max-w-xl">
              {featuredMovie.description}
            </p>
            <div className="flex items-center gap-4 mb-8">
              <span className="px-3 py-1 bg-gold/20 text-gold rounded-full text-sm font-medium">
                IMDb {featuredMovie.rating}
              </span>
              <span className="text-muted-foreground">{featuredMovie.year}</span>
              <span className="text-muted-foreground">{featuredMovie.duration}</span>
            </div>
            <Button 
              size="lg" 
              className="bg-gold hover:bg-gold-light text-black font-semibold"
              onClick={() => window.location.href = `/movie/${featuredMovie.id}`}
            >
              <Play className="w-5 h-5 mr-2" />
              Şimdi İzle
            </Button>
          </div>
        </div>
      </section>

      {/* Categories */}
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

      {/* Movies Grid */}
      <section className="container mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold mb-6">
          {selectedCategory === "Tümü" ? "Tüm Filmler" : selectedCategory}
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
      </section>
    </div>
  );
};

export default Index;
