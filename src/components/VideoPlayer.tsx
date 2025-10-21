import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import * as dashjs from "dashjs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, Settings } from "lucide-react";
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
}

const VideoPlayer = ({ src, poster }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
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
  const [qualities, setQualities] = useState<{ level: number; height: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);

  // Initialize Web Audio API for volume boost
  useEffect(() => {
    if (!videoRef.current) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaElementSource(videoRef.current);
      const gainNode = audioContext.createGain();

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      gainNodeRef.current = gainNode;
      sourceNodeRef.current = source;

      console.log("VideoPlayer: Web Audio API initialized for volume boost");
    } catch (err) {
      console.error("VideoPlayer: Failed to initialize Web Audio API", err);
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const normalizeUrl = (u: string) => {
    if (!u) return u;
    let out = u.trim();
    // Decode HTML entities
    out = out.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    // Fix missing protocol
    if (/^ttps?:\/\//i.test(out)) out = 'h' + out;
    if (/^\/\//.test(out)) out = 'https:' + out;
    return out;
  };

  useEffect(() => {
    if (!videoRef.current || !src) return;

    const video = videoRef.current;
    const normalizedSrc = normalizeUrl(src);
    setError(null);

    console.log("VideoPlayer: attempting to load", normalizedSrc);

    // Video event listeners
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    // Determine format
    const isHLS = /\.m3u8?(\?|$)/i.test(normalizedSrc);
    const isDASH = /\.mpd(\?|$)/i.test(normalizedSrc);
    const isMP4 = /\.mp4(\?|$)/i.test(normalizedSrc);

    try {
      if (isHLS && Hls.isSupported()) {
        console.log("VideoPlayer: using HLS.js");
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          xhrSetup: (xhr, url) => {
            xhr.withCredentials = false;
          },
        });
        
        hlsRef.current = hls;
        hls.loadSource(normalizedSrc);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("VideoPlayer: HLS manifest parsed successfully");
          // Get available quality levels
          const levels = hls.levels.map((level, index) => ({
            level: index,
            height: level.height
          }));
          setQualities(levels);
          setCurrentQuality(hls.currentLevel);
        });
        
        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          setCurrentQuality(data.level);
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("VideoPlayer: HLS error", data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("VideoPlayer: fatal network error, trying to recover");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("VideoPlayer: fatal media error, trying to recover");
                hls.recoverMediaError();
                break;
              default:
                setError("Video yüklenemedi. Lütfen daha sonra tekrar deneyin.");
                hls.destroy();
                break;
            }
          }
        });

        return () => {
          video.removeEventListener('timeupdate', handleTimeUpdate);
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('play', handlePlay);
          video.removeEventListener('pause', handlePause);
          hls.destroy();
          hlsRef.current = null;
        };
      } else if (isDASH) {
        console.log("VideoPlayer: using DASH.js");
        const player = dashjs.MediaPlayer().create();
        player.initialize(video, normalizedSrc, true);
        
        player.on('error', (e: any) => {
          console.error("VideoPlayer: DASH error", e);
          setError("Video yüklenemedi. Lütfen daha sonra tekrar deneyin.");
        });

        return () => {
          video.removeEventListener('timeupdate', handleTimeUpdate);
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('play', handlePlay);
          video.removeEventListener('pause', handlePause);
          player.destroy();
        };
      } else if (isMP4) {
        console.log("VideoPlayer: using native MP4");
        video.src = normalizedSrc;
        video.load();
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log("VideoPlayer: using Safari native HLS");
        video.src = normalizedSrc;
        video.load();
      } else {
        console.error("VideoPlayer: unsupported format");
        setError("Bu video formatı desteklenmiyor.");
      }
    } catch (err) {
      console.error("VideoPlayer: initialization error", err);
      setError("Video oynatıcı başlatılamadı.");
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [src]);

  // Control functions with useCallback
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const skipForward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
    }
  }, [duration]);

  const skipBackward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
    }
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  const changeQuality = useCallback((level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentQuality(level);
    }
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (videoRef.current) {
      const newVolume = value[0];
      setVolume(newVolume);
      
      // Use Web Audio API gain node for volume boost beyond 100%
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = newVolume;
      }
      
      // Keep video element volume at 1 (let gain node handle the boost)
      videoRef.current.volume = 1;
      setIsMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
    }
  }, [isMuted]);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default only for video player shortcuts
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (volume < 6) handleVolumeChange([volume + 0.5]);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (volume > 0) handleVolumeChange([volume - 0.5]);
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
  }, [togglePlay, skipBackward, skipForward, handleVolumeChange, toggleFullscreen, toggleMute, volume]);

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full bg-black rounded-lg overflow-hidden group aspect-video"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onTouchStart={() => setShowControls(true)}
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
            preload="metadata"
            onClick={togglePlay}
          >
            Tarayıcınız video oynatmayı desteklemiyor.
          </video>

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
                  {/* Skip Buttons */}
                  <button
                    onClick={skipBackward}
                    className="text-white hover:text-gold transition-colors"
                    title="10 saniye geri (Sol ok)"
                  >
                    <SkipBack className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                  <button
                    onClick={skipForward}
                    className="text-white hover:text-gold transition-colors"
                    title="10 saniye ileri (Sağ ok)"
                  >
                    <SkipForward className="w-5 h-5 md:w-6 md:h-6" />
                  </button>

                  {/* Volume Control */}
                  <div className="hidden sm:flex items-center gap-2 max-w-[150px] lg:max-w-[200px]">
                    <button
                      onClick={toggleMute}
                      className="text-white hover:text-gold transition-colors"
                      title="Sesi aç/kapat (M)"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5 md:w-6 md:h-6" />
                      ) : (
                        <Volume2 className="w-5 h-5 md:w-6 md:h-6" />
                      )}
                    </button>
                    <Slider
                      value={[volume]}
                      max={6}
                      step={0.1}
                      onValueChange={handleVolumeChange}
                      className="flex-1"
                    />
                    <span className="text-white text-xs font-medium min-w-[40px]">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
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

                  {/* Quality Selection */}
                  {qualities.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-white hover:text-gold hover:bg-white/10 h-8 px-2"
                          title="Kalite"
                        >
                          <Settings className="w-4 h-4 md:w-5 md:h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-black/95 border-gold/20">
                        <DropdownMenuLabel className="text-gold">Video Kalitesi</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-gold/20" />
                        <DropdownMenuItem
                          onClick={() => changeQuality(-1)}
                          className="text-white hover:text-gold hover:bg-gold/10 cursor-pointer"
                        >
                          {currentQuality === -1 && "✓ "}Otomatik
                        </DropdownMenuItem>
                        {qualities.map((quality) => (
                          <DropdownMenuItem
                            key={quality.level}
                            onClick={() => changeQuality(quality.level)}
                            className="text-white hover:text-gold hover:bg-gold/10 cursor-pointer"
                          >
                            {currentQuality === quality.level && "✓ "}{quality.height}p
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

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

export default VideoPlayer;
