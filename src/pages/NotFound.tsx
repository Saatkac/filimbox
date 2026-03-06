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
    <div className="flex min-h-screen items-center justify-center bg-cinema-dark">
      <div className="text-center">
        <Film className="w-16 h-16 text-gold mx-auto mb-6" />
        <h1 className="mb-4 text-6xl font-bold text-gold gold-glow">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Aradığınız sayfa bulunamadı</p>
        <Link to="/">
          <Button className="bg-gold hover:bg-gold-light text-black font-semibold">
            Ana Sayfaya Dön
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
