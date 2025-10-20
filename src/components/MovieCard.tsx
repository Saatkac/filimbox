import { Link } from "react-router-dom";
import { Star, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MovieCardProps {
  id: string;
  title: string;
  poster: string;
  rating: number;
  year: number;
  category: string;
}

const MovieCard = ({ id, title, poster, rating, year, category }: MovieCardProps) => {
  return (
    <Link to={`/movie/${id}`} className="group">
      <div className="relative overflow-hidden rounded-lg bg-card hover-lift">
        <div className="aspect-[2/3] relative">
          <img
            src={poster}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <Button variant="default" size="sm" className="w-full bg-gold hover:bg-gold-light text-black font-semibold">
                <Play className="w-4 h-4 mr-2" />
                İzle
              </Button>
            </div>
          </div>
        </div>
        
        <div className="p-3">
          <h3 className="font-semibold text-foreground line-clamp-1 mb-1">{title}</h3>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-gold text-gold" />
              {rating.toFixed(1)}
            </span>
            <span>{year}</span>
            <span className="text-gold text-xs">{category}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default MovieCard;
