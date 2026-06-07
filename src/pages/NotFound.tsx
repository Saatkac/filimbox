import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Film } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-cinema-dark px-6">
      <div className="text-center">
        <Film className="w-16 h-16 text-gold mx-auto mb-6" aria-hidden="true" />
        <h1 className="mb-4 text-6xl font-bold text-gold gold-glow">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Aradığınız sayfa bulunamadı</p>
        <Link to="/" aria-label="Ana sayfaya dön">
          <Button className="bg-gold hover:bg-gold-light text-black font-semibold min-h-11">
            Ana Sayfaya Dön
          </Button>
        </Link>
      </div>
    </main>
  );
};


export default NotFound;
