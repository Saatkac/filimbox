import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { movies } from "@/data/movies";
import { Search as SearchIcon } from "lucide-react";

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const searchResults = movies.filter(movie =>
    movie.title.toLowerCase().includes(query.toLowerCase()) ||
    movie.description.toLowerCase().includes(query.toLowerCase()) ||
    movie.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-cinema-dark">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-32 pb-16">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <SearchIcon className="w-8 h-8 text-gold" />
            <h1 className="text-4xl font-bold">
              Arama Sonuçları
            </h1>
          </div>
          <p className="text-muted-foreground">
            "<span className="text-gold">{query}</span>" için {searchResults.length} sonuç bulundu
          </p>
        </div>

        {searchResults.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {searchResults.map((movie) => (
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
        ) : (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">
              Aramanıza uygun film bulunamadı.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
