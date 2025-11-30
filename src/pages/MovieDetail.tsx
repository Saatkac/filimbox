import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import VideoPlayer from "@/components/VideoPlayer";
import MovieCard from "@/components/MovieCard";
import CommentSection from "@/components/CommentSection";
import WatchParty from "@/components/WatchParty";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Star, Clock, Calendar, ArrowLeft, Play, Heart, Users } from "lucide-react";

interface Episode {
  id: string;
  title: string;
  episode_number: number;
  season_number: number;
  description: string | null;
  duration: string | null;
  thumbnail_url: string | null;
  video_url: string;
}

const MovieDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState<any>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [similarContent, setSimilarContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMovie, setIsMovie] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [watchProgress, setWatchProgress] = useState<number>(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const [activeParty, setActiveParty] = useState<string | null>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const loadContent = useCallback(async () => {
    setLoading(true);

    try {
      console.log("MovieDetail: loading content", { id });

      // Try to load as movie first
      const { data: movieData } = await supabase
        .from("movies")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      let currentCategory: string | null = null;

      if (movieData) {
        console.log("MovieDetail: movie found", movieData);
        setContent(movieData);
        setIsMovie(true);
        setEpisodes([]);
        setSelectedEpisode(null);
        currentCategory = movieData.category ?? null;
      } else {
        // If not found, try series
        const { data: seriesData } = await supabase
          .from("series")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (seriesData) {
          console.log("MovieDetail: series found", seriesData);
          setContent(seriesData);
          setIsMovie(false);
          currentCategory = seriesData.category ?? null;

          // Fetch episodes for the series
          const { data: episodesData, error: episodesErr } = await supabase
            .from("episodes")
            .select("*")
            .eq("series_id", seriesData.id)
            .order("season_number", { ascending: true })
            .order("episode_number", { ascending: true });

          if (episodesErr) {
            console.error("MovieDetail: episodes fetch error", episodesErr);
          }

          console.log("MovieDetail: episodes loaded", episodesData?.length || 0);

          if (episodesData && episodesData.length > 0) {
            setEpisodes(episodesData);
            setSelectedEpisode(episodesData[0] ?? null);
          } else {
            setEpisodes([]);
            setSelectedEpisode(null);
          }
        } else {
          console.warn("MovieDetail: no content found for id", id);
        }
      }

      // Load similar content (based on category when available)
      if (currentCategory) {
        const [{ data: moviesData }, { data: seriesData }] = await Promise.all([
          supabase
            .from("movies")
            .select("*")
            .eq("category", currentCategory)
            .neq("id", id)
            .limit(4),
          supabase
            .from("series")
            .select("*")
            .eq("category", currentCategory)
            .neq("id", id)
            .limit(4),
        ]);

        setSimilarContent([...(moviesData || []), ...(seriesData || [])].slice(0, 4));
      } else {
        setSimilarContent([]);
      }
    } catch (e) {
      console.error("MovieDetail: loadContent fatal error", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadContent();
    }
  }, [id, loadContent]);

  useEffect(() => {
    if (user && id) {
      checkFavorite();
      loadWatchProgress();
    }
  }, [user, id, isMovie, selectedEpisode]);

  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  const checkFavorite = async () => {
    if (!user || !id) return;

    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .or(`movie_id.eq.${id},series_id.eq.${id}`)
      .maybeSingle();

    if (data) {
      setIsFavorite(true);
      setFavoriteId(data.id);
    } else {
      setIsFavorite(false);
      setFavoriteId(null);
    }
  };

  const loadWatchProgress = async () => {
    if (!user || !id) return;

    const query = supabase
      .from("watch_progress")
      .select("progress_seconds")
      .eq("user_id", user.id);

    if (isMovie) {
      query.eq("movie_id", id);
    } else if (selectedEpisode) {
      query.eq("episode_id", selectedEpisode.id);
    } else {
      return;
    }

    const { data } = await query.maybeSingle();
    if (data) {
      setWatchProgress(Number(data.progress_seconds));
    }
  };

  const saveWatchProgress = async (currentTime: number, duration: number) => {
    if (!user || !id) return;

    const progressData: any = {
      user_id: user.id,
      progress_seconds: currentTime,
      duration_seconds: duration,
      last_watched: new Date().toISOString(),
    };

    if (isMovie) {
      progressData.movie_id = id;
      progressData.series_id = null;
      progressData.episode_id = null;
    } else if (selectedEpisode) {
      progressData.movie_id = null;
      progressData.series_id = id;
      progressData.episode_id = selectedEpisode.id;
    } else {
      return;
    }

    await supabase.from("watch_progress").upsert(progressData, {
      onConflict: isMovie ? "user_id,movie_id" : "user_id,episode_id",
    });
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Hata", description: "Favorilere eklemek için giriş yapmalısınız" });
      return;
    }

    if (isFavorite && favoriteId) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId);

      if (!error) {
        setIsFavorite(false);
        setFavoriteId(null);
        toast({ title: "Başarılı", description: "Favorilerden çıkarıldı" });
      }
    } else {
      const { data, error } = await supabase
        .from("favorites")
        .insert({
          user_id: user.id,
          movie_id: isMovie ? id : null,
          series_id: isMovie ? null : id,
        })
        .select()
        .single();

      if (!error && data) {
        setIsFavorite(true);
        setFavoriteId(data.id);
        toast({ title: "Başarılı", description: "Favorilere eklendi" });
      } else if (error) {
        toast({ variant: "destructive", title: "Hata", description: error.message });
      }
    }
  };

  const startWatchParty = async () => {
    if (!user || !id) return;

    // First check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      // Create profile if doesn't exist
      const { error: createProfileError } = await supabase
        .from("profiles")
        .insert({
          user_id: user.id,
          username: user.email?.split('@')[0] || "Kullanıcı",
          avatar_url: "https://www.hdfilmizle.life/assets/front/img/default-pp.webp"
        });

      if (createProfileError) {
        console.error("Profile creation error:", createProfileError);
        toast({ variant: "destructive", title: "Profil oluşturulamadı", description: createProfileError.message });
        return;
      }
    }

    const { data, error } = await supabase
      .from("watch_parties")
      .insert({
        host_user_id: user.id,
        movie_id: isMovie ? id : null,
        series_id: !isMovie ? id : null,
        episode_id: selectedEpisode?.id || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error("Watch party creation error:", error);
      toast({ variant: "destructive", title: "Parti oluşturulamadı", description: error.message });
      return;
    }

    // Host olarak katıl
    const { error: participantError } = await supabase
      .from("watch_party_participants")
      .insert({
        party_id: data.id,
        user_id: user.id,
        is_host: true,
        video_progress: currentVideoTime
      });

    if (participantError) {
      console.error("Participant join error:", participantError);
      toast({ variant: "destructive", title: "Partiye katılma hatası", description: participantError.message });
      return;
    }

    setActiveParty(data.id);
    toast({ title: "Başarılı", description: "İzleme partisi başlatıldı! Arkadaşlarınızı davet edebilirsiniz." });
  };

  // Determine video source - must be before early returns (hooks rule)
  const videoSrc = useMemo(() => 
    isMovie
      ? content?.video_url
      : (selectedEpisode?.video_url || (episodes.length > 0 ? episodes[0]?.video_url : undefined)),
    [isMovie, content?.video_url, selectedEpisode, episodes]
  );

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

  if (!content) {
    return (
      <div className="min-h-screen bg-cinema-dark">
        <Navbar />
        <div className="container mx-auto px-4 pt-32 text-center">
          <h1 className="text-3xl font-bold mb-4">İçerik bulunamadı</h1>
          <Link to="/">
            <Button variant="default" className="bg-gold hover:bg-gold-light text-black">
              Ana Sayfaya Dön
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinema-dark">
      <Navbar />
      
      <div className="pt-20">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost" className="text-gold hover:text-gold-light">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
          </Link>
        </div>

        {isMovie ? (
          content.video_url ? (
            <div className="container mx-auto px-4 mb-8">
              <VideoPlayer
                key={content.video_url}
                src={content.video_url}
                poster={content.backdrop_url || content.poster_url}
                initialProgress={watchProgress}
                onProgressUpdate={(current, duration) => saveWatchProgress(current, duration)}
              />
            </div>
          ) : (
            <div className="container mx-auto px-4 mb-8 text-center py-8 bg-card rounded-lg">
              <p className="text-muted-foreground">Bu film için video henüz eklenmedi</p>
            </div>
          )
        ) : episodes.length === 0 ? (
          <div className="container mx-auto px-4 mb-8 text-center py-8 bg-card rounded-lg">
            <p className="text-muted-foreground">Bu dizi için henüz bölüm eklenmedi</p>
          </div>
        ) : videoSrc ? (
          <div className="container mx-auto px-4 mb-8">
            <VideoPlayer
              key={videoSrc}
              src={videoSrc}
              poster={content.backdrop_url || content.poster_url}
              initialProgress={watchProgress}
              onProgressUpdate={(current, duration) => saveWatchProgress(current, duration)}
            />
          </div>
        ) : (
          <div className="container mx-auto px-4 mb-8 text-center py-8 bg-card rounded-lg">
            <p className="text-muted-foreground">Bölüm yükleniyor...</p>
          </div>
        )}

        <div className="container mx-auto px-4 mb-12">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3">
              <img
                src={content.poster_url || "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop"}
                alt={content.title}
                loading="eager"
                fetchPriority="high"
                className="w-full rounded-lg shadow-2xl"
              />
            </div>
            
            <div className="md:w-2/3">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-4xl md:text-5xl font-bold gold-glow">
                  {content.title}
                </h1>
                <div className="flex gap-2">
                  <Button
                    onClick={startWatchParty}
                    variant="outline"
                    size="icon"
                    className="border-primary hover:bg-primary/20"
                    title="Arkadaşlarınızla izleyin"
                  >
                    <Users className="w-6 h-6 text-primary" />
                  </Button>
                  <Button
                    onClick={toggleFavorite}
                    variant="outline"
                    size="icon"
                    className="border-gold hover:bg-gold/20"
                  >
                    <Heart className={`w-6 h-6 ${isFavorite ? "fill-gold text-gold" : "text-gold"}`} />
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg">
                  <Star className="w-5 h-5 fill-gold text-gold" />
                  <span className="text-lg font-semibold">{content.rating || 'N/A'}</span>
                  <span className="text-muted-foreground">IMDb</span>
                </div>
                
                {content.year && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{content.year}</span>
                  </div>
                )}
                
                {isMovie && content.duration && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{content.duration}</span>
                  </div>
                )}
                
                <span className="px-3 py-1 bg-gold/20 text-gold rounded-full text-sm font-medium">
                  {content.category}
                </span>
              </div>
              
              {content.description && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-3">Hikaye</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {content.description}
                  </p>
                </div>
              )}

              {/* Episodes List for Series */}
              {!isMovie && episodes.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-2xl font-bold mb-4">Bölümler</h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {episodes.map((episode) => (
                      <div
                        key={episode.id}
                        onClick={() => setSelectedEpisode(episode)}
                        className={`p-4 rounded-lg cursor-pointer transition-all ${
                          selectedEpisode?.id === episode.id
                            ? 'bg-gold/20 border-2 border-gold'
                            : 'bg-card hover:bg-card/80 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {episode.thumbnail_url && (
                            <img
                              src={episode.thumbnail_url}
                              alt={episode.title}
                              loading="lazy"
                              className="w-32 h-20 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                S{episode.season_number}E{episode.episode_number}
                              </Badge>
                              {episode.duration && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {episode.duration}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold mb-1">{episode.title}</h3>
                            {episode.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {episode.description}
                              </p>
                            )}
                          </div>
                          <Play className="w-5 h-5 text-gold flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!isMovie && episodes.length === 0 && (
                <div className="mt-8">
                  <h2 className="text-2xl font-bold mb-2">Bölümler</h2>
                  <p className="text-muted-foreground">Bu dizi için henüz bölüm eklenmedi.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 pb-16">
          <CommentSection movieId={isMovie ? id : undefined} seriesId={!isMovie ? id : undefined} />
        </div>

        {similarContent.length > 0 && (
          <div className="container mx-auto px-4 pb-16">
            <h2 className="text-2xl font-bold mb-6">Benzer İçerikler</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {similarContent.map((item) => (
                <MovieCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  poster={item.poster_url || "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop"}
                  rating={item.rating}
                  year={item.year}
                  category={item.category}
                  duration={item.duration}
                />
              ))}
            </div>
          </div>
        )}

        {activeParty && (
          <WatchParty
            partyId={activeParty}
            onClose={() => setActiveParty(null)}
            onSeek={(time) => {
              if (videoRef.current) {
                videoRef.current.currentTime = time;
              }
            }}
            currentTime={currentVideoTime}
          />
        )}
      </div>
    </div>
  );
};

export default MovieDetail;
