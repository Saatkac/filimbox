import { memo, useState } from "react";
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
  duration?: string | null;
}

const MovieCard = ({ id, title, poster, rating, year, category, duration }: MovieCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <Link to={`/movie/${id}`} className="group block touch-manipulation">
      <div className="relative overflow-hidden rounded-lg bg-card hover-lift active:scale-[0.98] transition-transform">
        <div className="aspect-[2/3] relative bg-muted">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          <img
            src={imageError ? "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop" : poster}
            alt={title}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 md:transition-opacity md:duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4">
              <Button variant="default" size="sm" className="w-full bg-gold hover:bg-gold-light text-black font-semibold text-xs sm:text-sm">
                <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                İzle
              </Button>
            </div>
          </div>
          {/* Mobile tap indicator */}
          <div className="absolute inset-0 bg-gold/10 opacity-0 active:opacity-100 transition-opacity md:hidden pointer-events-none" />
        </div>
        
        <div className="p-2 sm:p-3">
          <h3 className="font-semibold text-foreground line-clamp-1 mb-1 text-sm sm:text-base">{title}</h3>
          <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground flex-wrap gap-1">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-gold text-gold" />
              {rating?.toFixed(1) || 'N/A'}
            </span>
            <span>{year || 'N/A'}</span>
            {duration && <span className="text-xs hidden sm:inline">{duration}</span>}
            <span className="text-gold text-xs truncate max-w-[60px] sm:max-w-none">{category}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default memo(MovieCard);
