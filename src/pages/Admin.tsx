import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, Tv, LogOut, Trash2, Plus, Upload, Loader2, MessageSquare, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { categories } from "@/data/categories";
import { z } from "zod";
import { parseM3U } from "@/utils/m3uParser";
import MovieCard from "@/components/MovieCard";
import AdminChat from "@/components/AdminChat";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const movieSchema = z.object({
  title: z.string().trim().min(1, "Başlık gereklidir").max(200),
  description: z.string().trim().max(1000).transform(val => val || undefined),
  poster_url: z.string().url("Geçerli bir URL girin").or(z.literal("")).transform(val => val || undefined),
  backdrop_url: z.string().url("Geçerli bir URL girin").or(z.literal("")).transform(val => val || undefined),
  rating: z.number().min(0).max(10),
  year: z.number().min(1900).max(2100),
  category: z.string().min(1, "Kategori gereklidir"),
  duration: z.string().trim().min(1, "Süre gereklidir"),
  video_url: z.string().url("Geçerli bir video URL girin"),
  trailer_url: z.string().url("Geçerli bir URL girin").or(z.literal("")).transform(val => val || undefined),
});

const seriesSchema = z.object({
  title: z.string().trim().min(1, "Başlık gereklidir").max(200),
  description: z.string().trim().max(1000).transform(val => val || undefined),
  poster_url: z.string().url("Geçerli bir URL girin").or(z.literal("")).transform(val => val || undefined),
  backdrop_url: z.string().url("Geçerli bir URL girin").or(z.literal("")).transform(val => val || undefined),
  rating: z.number().min(0).max(10),
  year: z.number().min(1900).max(2100),
  category: z.string().min(1, "Kategori gereklidir"),
  trailer_url: z.string().url("Geçerli bir URL girin").or(z.literal("")).transform(val => val || undefined),
});

const episodeSchema = z.object({
  title: z.string().trim().min(1, "Başlık gereklidir").max(200),
  description: z.string().trim().max(1000).transform(val => val || undefined),
  episode_number: z.number().min(1, "Bölüm numarası gereklidir"),
  season_number: z.number().min(1, "Sezon numarası gereklidir"),
  video_url: z.string().url("Geçerli bir video URL girin"),
  duration: z.string().trim().transform(val => val || undefined),
  thumbnail_url: z.string().url("Geçerli bir URL girin").or(z.literal("")).transform(val => val || undefined),
});

interface DuplicateSeriesInfo {
  movieTitle: string;
  movieUrl: string;
  seriesTitle: string;
  episodeTitle: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [movies, setMovies] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string>("");
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [m3uFile, setM3uFile] = useState<File | null>(null);
  const [sandboxM3uFile, setSandboxM3uFile] = useState<File | null>(null);
  const [sandboxParsed, setSandboxParsed] = useState<any[]>([]);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxSearch, setSandboxSearch] = useState("");
  const [sandboxDisplayCount, setSandboxDisplayCount] = useState(24);
  const [duplicateSeries, setDuplicateSeries] = useState<DuplicateSeriesInfo[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingMovies, setPendingMovies] = useState<any[]>([]);
  useEffect(() => {
    loadMovies();
    loadSeries();
  }, []);

  useEffect(() => {
    if (selectedSeries) {
      loadEpisodes(selectedSeries);
    }
  }, [selectedSeries]);

  const loadMovies = async () => {
    const { data } = await supabase.from("movies").select("*").order("created_at", { ascending: false });
    setMovies(data || []);
  };

  const loadSeries = async () => {
    const { data } = await supabase.from("series").select("*").order("created_at", { ascending: false });
    setSeries(data || []);
  };

  const loadEpisodes = async (seriesId: string) => {
    const { data } = await supabase
      .from("episodes")
      .select("*")
      .eq("series_id", seriesId)
      .order("season_number", { ascending: true })
      .order("episode_number", { ascending: true });
    setEpisodes(data || []);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleAddMovie = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const movieData = {
      title: (formData.get("title") as string) || "",
      description: (formData.get("description") as string) || "",
      poster_url: (formData.get("poster_url") as string) || "",
      backdrop_url: (formData.get("backdrop_url") as string) || "",
      rating: parseFloat((formData.get("rating") as string) || "0"),
      year: parseInt((formData.get("year") as string) || "0"),
      category: (formData.get("category") as string) || "",
      duration: (formData.get("duration") as string) || "",
      video_url: ((formData.get("video_url") as string) || "").replace(/&amp;/g, "&").trim(),
      trailer_url: (formData.get("trailer_url") as string) || "",
    };

    try {
      const validated = movieSchema.parse(movieData);
      
      const { error } = await supabase.from("movies").insert([validated as any]);

      if (error) {
        toast({ variant: "destructive", title: "Hata", description: error.message });
      } else {
        toast({ title: "Başarılı", description: "Film eklendi" });
        e.currentTarget.reset();
        loadMovies();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ variant: "destructive", title: "Doğrulama Hatası", description: error.errors[0].message });
      }
    }
  };

  const handleAddSeries = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const seriesData = {
      title: (formData.get("title") as string) || "",
      description: (formData.get("description") as string) || "",
      poster_url: (formData.get("poster_url") as string) || "",
      backdrop_url: (formData.get("backdrop_url") as string) || "",
      rating: parseFloat((formData.get("rating") as string) || "0"),
      year: parseInt((formData.get("year") as string) || "0"),
      category: (formData.get("category") as string) || "",
      trailer_url: (formData.get("trailer_url") as string) || "",
    };

    try {
      const validated = seriesSchema.parse(seriesData);
      
      const { error } = await supabase.from("series").insert([validated as any]);

      if (error) {
        toast({ variant: "destructive", title: "Hata", description: error.message });
      } else {
        toast({ title: "Başarılı", description: "Dizi eklendi" });
        e.currentTarget.reset();
        loadSeries();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ variant: "destructive", title: "Doğrulama Hatası", description: error.errors[0].message });
      }
    }
  };

  const handleAddEpisode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const episodeData = {
      title: (formData.get("title") as string) || "",
      description: (formData.get("description") as string) || "",
      episode_number: parseInt((formData.get("episode_number") as string) || "0"),
      season_number: parseInt((formData.get("season_number") as string) || "0"),
      video_url: ((formData.get("video_url") as string) || "").replace(/&amp;/g, "&").trim(),
      duration: (formData.get("duration") as string) || "",
      thumbnail_url: (formData.get("thumbnail_url") as string) || "",
    };

    try {
      const validated = episodeSchema.parse(episodeData);
      
      const { error } = await supabase.from("episodes").insert([{
        series_id: selectedSeries,
        ...validated,
      } as any]);

      if (error) {
        toast({ variant: "destructive", title: "Hata", description: error.message });
      } else {
        toast({ title: "Başarılı", description: "Bölüm eklendi" });
        e.currentTarget.reset();
        loadEpisodes(selectedSeries);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ variant: "destructive", title: "Doğrulama Hatası", description: error.errors[0].message });
      }
    }
  };

  const handleDeleteMovie = async (id: string) => {
    const { error } = await supabase.from("movies").delete().eq("id", id);
    if (!error) {
      toast({ title: "Başarılı", description: "Film silindi" });
      loadMovies();
    }
  };

  const handleDeleteSeries = async (id: string) => {
    const { error } = await supabase.from("series").delete().eq("id", id);
    if (!error) {
      toast({ title: "Başarılı", description: "Dizi silindi" });
      loadSeries();
    }
  };

  const handleDeleteEpisode = async (id: string) => {
    const { error } = await supabase.from("episodes").delete().eq("id", id);
    if (!error) {
      toast({ title: "Başarılı", description: "Bölüm silindi" });
      loadEpisodes(selectedSeries);
    }
  };

  const handleM3UImport = async () => {
    if (!m3uFile) {
      toast({ variant: "destructive", title: "Hata", description: "Lütfen bir M3U dosyası seçin" });
      return;
    }

    setImportLoading(true);
    
    try {
      const content = await m3uFile.text();
      const parsedMovies = parseM3U(content);
      
      if (parsedMovies.length === 0) {
        toast({ variant: "destructive", title: "Hata", description: "M3U dosyasında film bulunamadı" });
        setImportLoading(false);
        return;
      }

      // Episodes tablosundan tüm video_url'leri çek
      const { data: allEpisodes } = await supabase
        .from("episodes")
        .select("video_url, title, series_id");
      
      const { data: allSeries } = await supabase
        .from("series")
        .select("id, title");
      
      const seriesMap = new Map(allSeries?.map(s => [s.id, s.title]) || []);
      const episodeUrls = new Set(allEpisodes?.map(e => e.video_url) || []);
      
      // Aynı URL'ye sahip filmleri bul
      const duplicates: DuplicateSeriesInfo[] = [];
      const uniqueMovies: any[] = [];
      
      for (const movie of parsedMovies) {
        if (episodeUrls.has(movie.video_url)) {
          const matchingEpisode = allEpisodes?.find(e => e.video_url === movie.video_url);
          if (matchingEpisode) {
            duplicates.push({
              movieTitle: movie.title,
              movieUrl: movie.video_url,
              seriesTitle: seriesMap.get(matchingEpisode.series_id) || 'Bilinmeyen Dizi',
              episodeTitle: matchingEpisode.title
            });
          }
        } else {
          uniqueMovies.push(movie);
        }
      }
      
      // Eğer duplicate varsa dialog göster
      if (duplicates.length > 0) {
        setDuplicateSeries(duplicates);
        setPendingMovies(uniqueMovies);
        setShowDuplicateDialog(true);
        setImportLoading(false);
        return;
      }
      
      // Duplicate yoksa direkt import et
      await importMoviesToDatabase(uniqueMovies);
      
    } catch (error) {
      console.error("M3U import error:", error);
      toast({ variant: "destructive", title: "Hata", description: "M3U dosyası işlenirken hata oluştu" });
    }
    
    setImportLoading(false);
  };

  const importMoviesToDatabase = async (moviesToImport: any[]) => {
    if (moviesToImport.length === 0) {
      toast({ title: "Bilgi", description: "Import edilecek film bulunamadı" });
      return;
    }
    
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < moviesToImport.length; i += batchSize) {
      const batch = moviesToImport.slice(i, i + batchSize).map(movie => ({
        ...movie,
        source: 'm3u',
        imported_at: new Date().toISOString(),
        description: null,
        backdrop_url: null,
        trailer_url: null,
      }));

      const { error } = await supabase.from("movies").insert(batch);
      
      if (error) {
        console.error("Batch import error:", error);
      } else {
        imported += batch.length;
      }
    }

    toast({ 
      title: "Başarılı", 
      description: `${imported} film başarıyla içe aktarıldı` 
    });
    
    setM3uFile(null);
    loadMovies();
  };

  const handleDuplicateDialogConfirm = async (skipDuplicates: boolean) => {
    setShowDuplicateDialog(false);
    setImportLoading(true);
    
    if (skipDuplicates) {
      // Sadece unique filmleri import et
      await importMoviesToDatabase(pendingMovies);
    } else {
      // Tüm filmleri (duplicate olanlar dahil) import et
      const allMovies = [...pendingMovies, ...duplicateSeries.map(d => ({
        title: d.movieTitle,
        video_url: d.movieUrl,
        // Diğer alanlar parseM3U'dan gelir, burada sadece temel bilgileri ekliyoruz
        poster_url: '',
        category: 'Genel',
        year: null,
        rating: 7.0,
        duration: null,
      }))];
      await importMoviesToDatabase(allMovies);
    }
    
    setDuplicateSeries([]);
    setPendingMovies([]);
    setImportLoading(false);
  };

  const handleDeleteM3UMovies = async () => {
    if (!confirm("M3U'dan eklenen tüm filmleri silmek istediğinizden emin misiniz?")) {
      return;
    }

    const { error } = await supabase.from("movies").delete().eq("source", "m3u");
    
    if (!error) {
      toast({ title: "Başarılı", description: "M3U filmleri silindi" });
      loadMovies();
    } else {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    }
  };

  const handleSandboxParse = async () => {
    if (!sandboxM3uFile) {
      toast({ variant: "destructive", title: "Hata", description: "Lütfen bir M3U dosyası seçin" });
      return;
    }

    setSandboxLoading(true);
    
    try {
      const content = await sandboxM3uFile.text();
      const parsedMovies = parseM3U(content);
      
      if (parsedMovies.length === 0) {
        toast({ variant: "destructive", title: "Hata", description: "M3U dosyasında film bulunamadı" });
        setSandboxLoading(false);
        return;
      }

      setSandboxParsed(parsedMovies);
      setSandboxSearch("");
      setSandboxDisplayCount(24);
      toast({ 
        title: "Başarılı", 
        description: `${parsedMovies.length} film parse edildi` 
      });
    } catch (error) {
      console.error("M3U parse error:", error);
      toast({ variant: "destructive", title: "Hata", description: "M3U dosyası işlenirken hata oluştu" });
    }
    
    setSandboxLoading(false);
  };

  const handleSandboxScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    
    if (bottom && sandboxDisplayCount < filteredSandboxMovies.length) {
      setSandboxDisplayCount(prev => Math.min(prev + 24, filteredSandboxMovies.length));
    }
  };

  const filteredSandboxMovies = sandboxParsed.filter(movie => 
    movie.title.toLowerCase().includes(sandboxSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-cinema-dark p-6">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Film className="w-8 h-8 text-gold" />
            <h1 className="text-3xl font-bold text-gold gold-glow">Admin Paneli</h1>
          </div>
          <Button onClick={handleLogout} variant="destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış Yap
          </Button>
        </div>

        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="bg-card">
            <TabsTrigger value="chat">
              <MessageSquare className="w-4 h-4 mr-2" />
              AI Asistan
            </TabsTrigger>
            <TabsTrigger value="sandbox">
              <Upload className="w-4 h-4 mr-2" />
              Sandbox Test
            </TabsTrigger>
            <TabsTrigger value="movies">
              <Film className="w-4 h-4 mr-2" />
              Filmler
            </TabsTrigger>
            <TabsTrigger value="series">
              <Tv className="w-4 h-4 mr-2" />
              Diziler
            </TabsTrigger>
            <TabsTrigger value="episodes">
              <Plus className="w-4 h-4 mr-2" />
              Bölümler
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat">
            <AdminChat />
          </TabsContent>

          <TabsContent value="sandbox" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>🧪 M3U Sandbox Test</CardTitle>
                <CardDescription>
                  M3U dosyanızı yükleyin ve içeriği kontrol edin. Veritabanına eklemeden önce filmleri test edin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sandbox-m3u-file">M3U Dosyası</Label>
                  <Input
                    id="sandbox-m3u-file"
                    type="file"
                    accept=".m3u,.m3u8"
                    onChange={(e) => {
                      setSandboxM3uFile(e.target.files?.[0] || null);
                      setSandboxParsed([]);
                    }}
                    className="bg-secondary"
                  />
                </div>
                <Button
                  onClick={handleSandboxParse}
                  disabled={sandboxLoading || !sandboxM3uFile}
                  className="bg-gold hover:bg-gold-light text-black"
                >
                  {sandboxLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Parse Ediliyor...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Dosyayı Parse Et
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {sandboxParsed.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Parse Sonuçları ({sandboxParsed.length} film)</CardTitle>
                  <CardDescription>
                    Arama yapın ve aşağı kaydırarak tüm filmleri görüntüleyin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Search Input */}
                  <div className="space-y-2">
                    <Label htmlFor="sandbox-search">Film Ara</Label>
                    <Input
                      id="sandbox-search"
                      type="text"
                      placeholder="Film adı yazın..."
                      value={sandboxSearch}
                      onChange={(e) => {
                        setSandboxSearch(e.target.value);
                        setSandboxDisplayCount(24);
                      }}
                      className="bg-secondary"
                    />
                    <p className="text-xs text-muted-foreground">
                      {filteredSandboxMovies.length} film bulundu
                    </p>
                  </div>
                  {/* Category Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(
                      filteredSandboxMovies.reduce((acc: any, movie) => {
                        acc[movie.category] = (acc[movie.category] || 0) + 1;
                        return acc;
                      }, {})
                    )
                      .sort(([, a]: any, [, b]: any) => b - a)
                      .slice(0, 8)
                      .map(([category, count]: any) => (
                        <div key={category} className="bg-secondary p-4 rounded-lg">
                          <div className="text-2xl font-bold text-gold">{count}</div>
                          <div className="text-sm text-muted-foreground">{category}</div>
                        </div>
                      ))}
                  </div>

                  {/* Site Preview with Infinite Scroll */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">🎬 Site Önizlemesi</h3>
                    <p className="text-sm text-muted-foreground">
                      M3U dosyası import edildiğinde sitenizde bu şekilde görünecek. Aşağı kaydırarak daha fazla film yükleyin. ({sandboxDisplayCount} / {filteredSandboxMovies.length} film gösteriliyor)
                    </p>
                    <div 
                      className="max-h-[800px] overflow-y-auto pr-2"
                      onScroll={handleSandboxScroll}
                    >
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {filteredSandboxMovies.slice(0, sandboxDisplayCount).map((movie, idx) => (
                          <MovieCard
                            key={idx}
                            id={`sandbox-${idx}`}
                            title={movie.title}
                            poster={movie.poster_url || "https://via.placeholder.com/300x450"}
                            rating={movie.rating}
                            year={movie.year}
                            category={movie.category}
                            duration={movie.duration}
                          />
                        ))}
                      </div>
                      {sandboxDisplayCount < filteredSandboxMovies.length && (
                        <div className="text-center py-8">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gold" />
                          <p className="text-sm text-muted-foreground mt-2">Aşağı kaydırın...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="movies" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>M3U Dosyasından Toplu Film Ekle</CardTitle>
                <CardDescription>M3U dosyası seçin ve filmleri içe aktarın</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="m3u-file">M3U Dosyası</Label>
                  <Input
                    id="m3u-file"
                    type="file"
                    accept=".m3u,.m3u8"
                    onChange={(e) => setM3uFile(e.target.files?.[0] || null)}
                    className="bg-secondary"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleM3UImport}
                    disabled={importLoading || !m3uFile}
                    className="bg-gold hover:bg-gold-light text-black"
                  >
                    {importLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        İçe Aktarılıyor...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        M3U'dan İçe Aktar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteM3UMovies}
                    disabled={importLoading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    M3U Filmlerini Sil
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Yeni Film Ekle</CardTitle>
                <CardDescription>Film bilgilerini doldurun</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddMovie} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Başlık *</Label>
                      <Input name="title" required className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Kategori *</Label>
                      <Select name="category" required>
                        <SelectTrigger className="bg-secondary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.filter(c => c !== "Tümü").map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Yıl *</Label>
                      <Input name="year" type="number" required className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rating">IMDb Puanı *</Label>
                      <Input name="rating" type="number" step="0.1" min="0" max="10" required className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Süre *</Label>
                      <Input name="duration" placeholder="2s 25dk" required className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="video_url">Video URL *</Label>
                      <Input name="video_url" type="url" required className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="poster_url">Poster URL</Label>
                      <Input name="poster_url" type="url" className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backdrop_url">Backdrop URL</Label>
                      <Input name="backdrop_url" type="url" className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trailer_url">Fragman URL</Label>
                      <Input name="trailer_url" type="url" className="bg-secondary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Açıklama</Label>
                    <Textarea name="description" rows={3} className="bg-secondary" />
                  </div>
                  <Button type="submit" className="bg-gold hover:bg-gold-light text-black">
                    Film Ekle
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Mevcut Filmler ({movies.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {movies.map((movie) => (
                    <div key={movie.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div>
                        <p className="font-semibold">{movie.title}</p>
                        <p className="text-sm text-muted-foreground">{movie.year} • {movie.category}</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteMovie(movie.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="series" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Yeni Dizi Ekle</CardTitle>
                <CardDescription>Dizi bilgilerini doldurun</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddSeries} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Başlık *</Label>
                      <Input name="title" required className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Kategori *</Label>
                      <Select name="category" required>
                        <SelectTrigger className="bg-secondary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.filter(c => c !== "Tümü").map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Yıl *</Label>
                      <Input name="year" type="number" required className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rating">IMDb Puanı *</Label>
                      <Input name="rating" type="number" step="0.1" min="0" max="10" required className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="poster_url">Poster URL</Label>
                      <Input name="poster_url" type="url" className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backdrop_url">Backdrop URL</Label>
                      <Input name="backdrop_url" type="url" className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trailer_url">Fragman URL</Label>
                      <Input name="trailer_url" type="url" className="bg-secondary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Açıklama</Label>
                    <Textarea name="description" rows={3} className="bg-secondary" />
                  </div>
                  <Button type="submit" className="bg-gold hover:bg-gold-light text-black">
                    Dizi Ekle
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Mevcut Diziler ({series.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {series.map((show) => (
                    <div key={show.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div>
                        <p className="font-semibold">{show.title}</p>
                        <p className="text-sm text-muted-foreground">{show.year} • {show.category}</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSeries(show.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="episodes" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Diziye Bölüm Ekle</CardTitle>
                <CardDescription>Önce dizi seçin, sonra bölüm ekleyin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="series_select">Dizi Seçin *</Label>
                  <Select value={selectedSeries} onValueChange={setSelectedSeries}>
                    <SelectTrigger className="bg-secondary">
                      <SelectValue placeholder="Bir dizi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {series.map((show) => (
                        <SelectItem key={show.id} value={show.id}>
                          {show.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSeries && (
                  <form onSubmit={handleAddEpisode} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Bölüm Başlığı *</Label>
                        <Input name="title" required className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="season_number">Sezon *</Label>
                        <Input name="season_number" type="number" min="1" required className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="episode_number">Bölüm No *</Label>
                        <Input name="episode_number" type="number" min="1" required className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration">Süre</Label>
                        <Input name="duration" placeholder="45dk" className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="video_url">Video URL *</Label>
                        <Input name="video_url" type="url" required className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                        <Input name="thumbnail_url" type="url" className="bg-secondary" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Açıklama</Label>
                      <Textarea name="description" rows={2} className="bg-secondary" />
                    </div>
                    <Button type="submit" className="bg-gold hover:bg-gold-light text-black">
                      Bölüm Ekle
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {selectedSeries && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>
                    {series.find(s => s.id === selectedSeries)?.title} - Bölümler ({episodes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {episodes.map((episode) => (
                      <div key={episode.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                        <div>
                          <p className="font-semibold">
                            S{episode.season_number}E{episode.episode_number} - {episode.title}
                          </p>
                          <p className="text-sm text-muted-foreground">{episode.duration}</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteEpisode(episode.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Duplicate Series Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="w-5 h-5" />
              Aynı Linke Sahip Diziler Bulundu!
            </DialogTitle>
            <DialogDescription>
              M3U dosyasındaki bazı filmler, sistemde kayıtlı dizilerle aynı video linkine sahip. 
              Bu filmleri import etmek istiyor musunuz?
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-3">
              {duplicateSeries.map((dup, index) => (
                <div key={index} className="p-3 bg-secondary rounded-lg border border-border">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">
                      Film: <span className="text-gold">{dup.movieTitle}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Dizi: {dup.seriesTitle} - {dup.episodeTitle}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      URL: {dup.movieUrl.substring(0, 60)}...
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="text-sm text-muted-foreground">
            <p>Toplam: {duplicateSeries.length} çakışan film</p>
            <p>Import edilecek benzersiz film: {pendingMovies.length}</p>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDuplicateDialog(false)}
            >
              İptal
            </Button>
            <Button 
              variant="secondary"
              onClick={() => handleDuplicateDialogConfirm(true)}
            >
              Çakışanları Atla ({pendingMovies.length} film)
            </Button>
            <Button 
              className="bg-gold hover:bg-gold-light text-black"
              onClick={() => handleDuplicateDialogConfirm(false)}
            >
              Tümünü Import Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
