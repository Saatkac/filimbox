import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import VideoPlayer from "@/components/VideoPlayer";
import MovieCard from "@/components/MovieCard";
import { movies } from "@/data/movies";
import { Button } from "@/components/ui/button";
import { Star, Clock, Calendar, ArrowLeft } from "lucide-react";

const MovieDetail = () => {
  const { id } = useParams();
  const movie = movies.find((m) => m.id === id);
  
  if (!movie) {
    return (
      <div className="min-h-screen bg-cinema-dark">
        <Navbar />
        <div className="container mx-auto px-4 pt-32 text-center">
          <h1 className="text-3xl font-bold mb-4">Film bulunamadı</h1>
          <Link to="/">
            <Button variant="default" className="bg-gold hover:bg-gold-light text-black">
              Ana Sayfaya Dön
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const similarMovies = movies
    .filter((m) => m.category === movie.category && m.id !== movie.id)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-cinema-dark">
      <Navbar />
      
      <div className="pt-20">
        {/* Back Button */}
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost" className="text-gold hover:text-gold-light">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
          </Link>
        </div>

        {/* Video Player */}
        <div className="container mx-auto px-4 mb-8">
          <VideoPlayer src={movie.videoUrl} poster={movie.backdrop} />
        </div>

        {/* Movie Info */}
        <div className="container mx-auto px-4 mb-12">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3">
              <img
                src={movie.poster}
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
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{movie.year}</span>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{movie.duration}</span>
                </div>
                
                <span className="px-3 py-1 bg-gold/20 text-gold rounded-full text-sm font-medium">
                  {movie.category}
                </span>
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3">Hikaye</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {movie.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Movies */}
        {similarMovies.length > 0 && (
          <div className="container mx-auto px-4 pb-16">
            <h2 className="text-2xl font-bold mb-6">Benzer Filmler</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {similarMovies.map((movie) => (
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
        )}
      </div>
    </div>
  );
};

export default MovieDetail;
