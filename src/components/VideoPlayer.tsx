import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
import Hls from "hls.js";
import * as dashjs from "dashjs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipForward, SkipBack } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface VideoPlayerProps {
  src: string;
  poster?: string;
  initialProgress?: number;
  onProgressUpdate?: (currentTime: number, duration: number) => void;
}

const VideoPlayer = ({ src, poster, initialProgress = 0, onProgressUpdate }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  const normalizeUrl = (u: string) => {
    if (!u) return u;
    let out = u.trim();
    // Decode HTML entities
    out = out.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    // Fix missing protocol
    if (/^ttps?:\/\//i.test(out)) out = 'h' + out;
    if (/^\/\//.test(out)) out = 'https:' + out;
    // Auto-fix common HLS URL patterns from M3U imports
    if (!/\.m3u8(\?|$)/i.test(out)) {
      if (out.endsWith('/')) out = out + 'index.m3u8';
      if (/\/main\/?$/i.test(out)) out = out.replace(/\/main\/?$/i, '/main/index.m3u8');
      if (/\/master$/i.test(out)) out = out + '.m3u8';
    }
    return out;
  };

  // Build fallback candidates for HLS URLs (handle various host patterns)
  const getHlsCandidates = (u: string): string[] => {
    const url = u.trim();
    const list: string[] = [];
    const push = (x: string) => { if (!list.includes(x)) list.push(x); };

    if (/\.m3u8(\?|$)/i.test(url)) return [url];

    // Trailing slash like /vs/ttxxxx/ -> try common playlist names
    if (url.endsWith('/')) {
      push(url + 'index.m3u8');
      push(url + 'master.m3u8');
      push(url + '720.m3u8');
    }

    // "/main" endings
    if (/\/main\/?$/i.test(url)) {
      push(url.replace(/\/main\/?$/i, '/main/index.m3u8'));
      push(url.replace(/\/main\/?$/i, '/main/master.m3u8'));
      push(url.replace(/\/main\/?$/i, '/main/720.m3u8'));
    }

    // "master" without extension
    if (/\/master$/i.test(url) && !/\.m3u8(\?|$)/i.test(url)) {
      push(url + '.m3u8');
    }

    return list.length ? list : [url];
  };

  useEffect(() => {
    if (!videoRef.current || !src) return;

    const video = videoRef.current;
    const normalizedSrc = normalizeUrl(src);
    let nativeErrorHandler: ((e: Event) => void) | null = null;
    setError(null);

    // Video event listeners
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      // Seek to initial progress if provided
      if (initialProgress > 0 && video.duration > 0) {
        video.currentTime = Math.min(initialProgress, video.duration - 10);
      }
    };
    const handlePlay = () => {
      setIsPlaying(true);
      // Start progress update interval
      if (onProgressUpdate && !progressUpdateInterval.current) {
        progressUpdateInterval.current = setInterval(() => {
          if (video.currentTime > 0 && video.duration > 0) {
            onProgressUpdate(video.currentTime, video.duration);
          }
        }, 5000); // Update every 5 seconds
      }
    };
    const handlePause = () => {
      setIsPlaying(false);
      // Save progress on pause
      if (onProgressUpdate && video.currentTime > 0 && video.duration > 0) {
        onProgressUpdate(video.currentTime, video.duration);
      }
    };
    const handleCanPlay = () => setIsReady(true);

    // Web Audio API for volume boost (guard against cross-origin errors)
    if (!audioContextRef.current) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaElementSource(video);
        const gainNode = audioContext.createGain();
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        audioContextRef.current = audioContext;
        gainNodeRef.current = gainNode;
        gainNode.gain.value = volume;
      } catch (e) {
        // Disable boost gracefully if not allowed by CORS
        audioContextRef.current = null;
        gainNodeRef.current = null;
      }
    }
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('canplay', handleCanPlay);

    // Determine format
    const isHLS = /\.m3u8?(\?|$)/i.test(normalizedSrc);
    const isDASH = /\.mpd(\?|$)/i.test(normalizedSrc);
    const isMP4 = /\.mp4(\?|$)/i.test(normalizedSrc);

    try {
      if (isHLS && Hls.isSupported()) {
        const candidates = getHlsCandidates(normalizedSrc);
        let current = 0;
        let hls: Hls | null = null;

        const initHls = (url: string) => {
          if (hls) {
            try { hls.destroy(); } catch {}
          }
          hls = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            maxBufferSize: 60 * 1000 * 1000,
            backBufferLength: 60,
            enableWorker: true,
            lowLatencyMode: false,
            startLevel: -1,
            capLevelToPlayerSize: true,
          });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);

          hls.on(Hls.Events.ERROR, (_, data) => {
            // Retry strategy: recover once, then try next candidate
            // Track local counters via closure
            (hls as any)._networkRetry = (hls as any)._networkRetry ?? 0;
            (hls as any)._mediaRecover = (hls as any)._mediaRecover ?? 0;

            if (data.fatal) {
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                if ((hls as any)._networkRetry < 1) {
                  (hls as any)._networkRetry++;
                  hls.startLoad();
                } else {
                  const next = candidates[++current];
                  if (next) initHls(next); else {
                    setError("Video yüklenemedi. Lütfen farklı bir içerik deneyin.");
                    try { hls?.destroy(); } catch {}
                    hlsRef.current = null;
                  }
                }
              } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                if ((hls as any)._mediaRecover < 1) {
                  (hls as any)._mediaRecover++;
                  hls.recoverMediaError();
                } else {
                  const next = candidates[++current];
                  if (next) initHls(next); else {
                    setError("Video yüklenemedi. Lütfen farklı bir içerik deneyin.");
                    try { hls?.destroy(); } catch {}
                    hlsRef.current = null;
                  }
                }
              } else {
                const next = candidates[++current];
                if (next) initHls(next); else {
                  setError("Video yüklenemedi. Lütfen farklı bir içerik deneyin.");
                  try { hls?.destroy(); } catch {}
                  hlsRef.current = null;
                }
              }
            }
          });
        };

        initHls(candidates[0]);

        return () => {
          video.removeEventListener('timeupdate', handleTimeUpdate);
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('play', handlePlay);
          video.removeEventListener('pause', handlePause);
          video.removeEventListener('canplay', handleCanPlay);
          try { hls?.destroy(); } catch {}
          hlsRef.current = null;
        };
      } else if (isDASH) {
        const player = dashjs.MediaPlayer().create();
        player.initialize(video, normalizedSrc, true);
        
        player.on('error', (e: any) => {
          setError("Video yüklenemedi. Lütfen daha sonra tekrar deneyin.");
        });

        return () => {
          video.removeEventListener('timeupdate', handleTimeUpdate);
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('play', handlePlay);
          video.removeEventListener('pause', handlePause);
          video.removeEventListener('canplay', handleCanPlay);
          player.destroy();
        };
      } else if (isMP4) {
        video.src = normalizedSrc;
        video.load();
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        const candidates = getHlsCandidates(normalizedSrc);
        let idx = 0;
        const setNativeSrc = (u: string) => { video.src = u; video.load(); };
        nativeErrorHandler = () => {
          idx++;
          const next = candidates[idx];
          if (next) {
            setNativeSrc(next);
          } else {
            setError("Video yüklenemedi. Lütfen farklı bir içerik deneyin.");
            if (nativeErrorHandler) video.removeEventListener('error', nativeErrorHandler as any);
          }
        };
        video.addEventListener('error', nativeErrorHandler as any);
        setNativeSrc(candidates[0]);
      } else {
        setError("Bu video formatı desteklenmiyor.");
      }
    } catch (err) {
      setError("Video oynatıcı başlatılamadı.");
    }

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('canplay', handleCanPlay);
        if (nativeErrorHandler) { try { video.removeEventListener('error', nativeErrorHandler as any); } catch {} }
        
        // Clear progress update interval
        if (progressUpdateInterval.current) {
          clearInterval(progressUpdateInterval.current);
          progressUpdateInterval.current = null;
        }
        
        // Save final progress
        if (onProgressUpdate && video.currentTime > 0 && video.duration > 0) {
          onProgressUpdate(video.currentTime, video.duration);
        }
      };
  }, [src, onProgressUpdate, initialProgress]);

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
    }
  };

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const changePlaybackRate = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = Math.min(value[0], 6); // Limit to 600%
    setVolume(newVolume);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume;
    }
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    setControlsTimeout(timeout);

    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, []);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    setControlsTimeout(timeout);
  }, [controlsTimeout]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Keyboard controls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!container.contains(document.activeElement)) return;
      
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipTime(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipTime(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (volume < 6) handleVolumeChange([Math.min(volume + 0.2, 6)]);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (volume > 0) handleVolumeChange([Math.max(volume - 0.2, 0)]);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleVolumeChange, toggleFullscreen, toggleMute, volume]);

  const formatTime = useMemo(() => {
    return (time: number) => {
      const hours = Math.floor(time / 3600);
      const minutes = Math.floor((time % 3600) / 60);
      const seconds = Math.floor(time % 60);
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full bg-black rounded-lg overflow-hidden group aspect-video touch-none"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onTouchStart={() => {
        setShowControls(true);
        if (controlsTimeout) clearTimeout(controlsTimeout);
        const timeout = setTimeout(() => setShowControls(false), 3000);
        setControlsTimeout(timeout);
      }}
      tabIndex={0}
    >
      {error ? (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          <video
            ref={videoRef}
            poster={poster}
            className="w-full h-full max-h-[100vh] object-contain"
            crossOrigin="anonymous"
            preload="auto"
            playsInline
            onClick={togglePlay}
          >
            Tarayıcınız video oynatmayı desteklemiyor.
          </video>

          {/* Loading Indicator */}
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-gold text-lg">Video hazırlanıyor...</div>
            </div>
          )}

          {/* Custom Controls */}
          <div 
            className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Center Play/Pause Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={togglePlay}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gold/90 hover:bg-gold flex items-center justify-center transition-all hover:scale-110"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 md:w-10 md:h-10 text-black" />
                ) : (
                  <Play className="w-8 h-8 md:w-10 md:h-10 text-black ml-1" />
                )}
              </button>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 space-y-2">
              {/* Progress Bar */}
              <div className="flex items-center gap-2">
                <span className="text-white text-xs md:text-sm font-medium min-w-[45px]">
                  {formatTime(currentTime)}
                </span>
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="flex-1"
                />
                <span className="text-white text-xs md:text-sm font-medium min-w-[45px]">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between gap-2 md:gap-4">
                {/* Left Side Controls */}
                <div className="flex items-center gap-2 md:gap-3">
                  {/* Skip Backward */}
                  <button
                    onClick={() => skipTime(-10)}
                    className="text-white hover:text-gold transition-colors"
                    title="10 saniye geri"
                  >
                    <SkipBack className="w-5 h-5 md:w-6 md:h-6" />
                  </button>

                  {/* Skip Forward */}
                  <button
                    onClick={() => skipTime(10)}
                    className="text-white hover:text-gold transition-colors"
                    title="10 saniye ileri"
                  >
                    <SkipForward className="w-5 h-5 md:w-6 md:h-6" />
                  </button>

                  {/* Volume Control */}
                  <div className="hidden md:flex items-center gap-2 w-[150px] lg:w-[200px]">
                    <button
                      onClick={toggleMute}
                      className="text-white hover:text-gold transition-colors flex-shrink-0"
                      title="Sesi aç/kapat (M)"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5 md:w-6 md:h-6" />
                      ) : (
                        <Volume2 className="w-5 h-5 md:w-6 md:h-6" />
                      )}
                    </button>
                    <div className="flex-1">
                      <Slider
                        value={[volume]}
                        max={6}
                        step={0.1}
                        onValueChange={handleVolumeChange}
                      />
                    </div>
                    <span className="text-white text-xs font-medium min-w-[40px] lg:min-w-[45px] flex-shrink-0 text-right">
                      {Math.round((volume / 6) * 600)}%
                    </span>
                  </div>
                  
                  {/* Mobile Volume Button */}
                  <button
                    onClick={toggleMute}
                    className="md:hidden text-white hover:text-gold transition-colors"
                    title="Sesi aç/kapat"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Right Side Controls */}
                <div className="flex items-center gap-2 md:gap-3">
                  {/* Playback Speed */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-white hover:text-gold hover:bg-white/10 h-8 px-2 text-xs md:text-sm"
                      >
                        {playbackRate}x
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-black/95 border-gold/20">
                      <DropdownMenuLabel className="text-gold">Oynatma Hızı</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-gold/20" />
                      {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                        <DropdownMenuItem
                          key={rate}
                          onClick={() => changePlaybackRate(rate)}
                          className="text-white hover:text-gold hover:bg-gold/10 cursor-pointer"
                        >
                          {rate === playbackRate && "✓ "}{rate}x
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Fullscreen Toggle */}
                  <button
                    onClick={toggleFullscreen}
                    className="text-white hover:text-gold transition-colors"
                    title="Tam ekran (F)"
                  >
                    {isFullscreen ? (
                      <Minimize className="w-5 h-5 md:w-6 md:h-6" />
                    ) : (
                      <Maximize className="w-5 h-5 md:w-6 md:h-6" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default memo(VideoPlayer);
