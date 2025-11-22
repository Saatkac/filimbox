import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
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
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) {
      console.log('[VideoPlayer] No video element or src');
      return;
    }

    console.log('[VideoPlayer] Initializing with src:', src);
    setError(null);

    // Event handlers
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (onProgressUpdate && video.duration > 0) {
        onProgressUpdate(video.currentTime, video.duration);
      }
    };
    
    const handleLoadedMetadata = () => {
      console.log('[VideoPlayer] Metadata loaded, duration:', video.duration);
      setDuration(video.duration);
      if (initialProgress > 0 && video.duration > 0) {
        video.currentTime = Math.min(initialProgress, video.duration - 1);
      }
    };
    
    const handlePlay = () => {
      console.log('[VideoPlayer] Playing');
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      console.log('[VideoPlayer] Paused');
      setIsPlaying(false);
    };
    
    const handleVideoError = (e: Event) => {
      console.error('[VideoPlayer] Video element error:', e);
      const videoEl = e.target as HTMLVideoElement;
      if (videoEl.error) {
        console.error('[VideoPlayer] Video error code:', videoEl.error.code, videoEl.error.message);
      }
      setError("Video yüklenemedi. Lütfen tekrar deneyin.");
    };

    // Attach event listeners
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleVideoError);

    // Check if source is HLS
    const isHLS = src.includes('.m3u8');
    
    if (isHLS) {
      console.log('[VideoPlayer] HLS detected');
      
      if (Hls.isSupported()) {
        console.log('[VideoPlayer] HLS.js is supported, initializing...');
        
        // Destroy existing HLS instance
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }

        // Create new HLS instance with optimized settings
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: false,
          // Buffer settings
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 1.0,
          highBufferWatchdogPeriod: 3,
          nudgeOffset: 0.1,
          nudgeMaxRetry: 5,
          // Loading settings
          manifestLoadingTimeOut: 20000,
          manifestLoadingMaxRetry: 6,
          manifestLoadingRetryDelay: 1000,
          levelLoadingTimeOut: 20000,
          levelLoadingMaxRetry: 6,
          levelLoadingRetryDelay: 1000,
          fragLoadingTimeOut: 30000,
          fragLoadingMaxRetry: 6,
          fragLoadingRetryDelay: 1000,
          // CORS settings
          xhrSetup: function(xhr: XMLHttpRequest, url: string) {
            xhr.withCredentials = false;
          },
        });

        hlsRef.current = hls;

        // HLS event handlers
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('[VideoPlayer] HLS manifest parsed successfully');
        });

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('[VideoPlayer] HLS media attached');
          hls.loadSource(src);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('[VideoPlayer] HLS error:', data.type, data.details);
          
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('[VideoPlayer] Fatal network error, recovering...');
                hls.startLoad();
                break;
              
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('[VideoPlayer] Fatal media error, recovering...');
                hls.recoverMediaError();
                break;
              
              default:
                console.error('[VideoPlayer] Fatal error, cannot recover');
                setError("Video yüklenemiyor. Lütfen başka bir video deneyin.");
                hls.destroy();
                break;
            }
          }
        });

        // Attach media and load source
        hls.attachMedia(video);
        
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari, iOS)
        console.log('[VideoPlayer] Using native HLS support');
        video.src = src;
        video.load();
      } else {
        console.error('[VideoPlayer] HLS not supported in this browser');
        setError("Bu tarayıcı HLS videolarını desteklemiyor.");
      }
    } else {
      // Direct video playback (MP4, WebM, etc.)
      console.log('[VideoPlayer] Direct video playback');
      video.src = src;
      video.load();
    }

    // Cleanup
    return () => {
      console.log('[VideoPlayer] Cleaning up');
      
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleVideoError);
      
      if (hlsRef.current) {
        console.log('[VideoPlayer] Destroying HLS instance');
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, initialProgress, onProgressUpdate]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => {
          console.error('[VideoPlayer] Play failed:', e);
          setError("Video oynatılamıyor. Lütfen tekrar deneyin.");
        });
      }
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    if (videoRef.current && duration > 0) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, [duration]);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (videoRef.current) {
      const newVolume = value[0];
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
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

  const skipTime = (seconds: number) => {
    if (videoRef.current && duration > 0) {
      const newTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
      videoRef.current.currentTime = newTime;
    }
  };

  const changePlaybackRate = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const timeout = setTimeout(() => setShowControls(false), 3000);
    setControlsTimeout(timeout);
  }, [controlsTimeout]);

  if (error) {
    return (
      <div className="w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <Alert variant="destructive" className="m-4 max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full bg-black rounded-lg overflow-hidden aspect-video"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        poster={poster}
        playsInline
        onClick={togglePlay}
      />

      {/* Controls Overlay */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Play/Pause Button (Center) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 md:w-10 md:h-10 text-white" />
            ) : (
              <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" />
            )}
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          {/* Progress Bar */}
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />

          {/* Control Buttons Row */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <button onClick={togglePlay} className="hover:text-gold transition-colors">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              
              <button onClick={() => skipTime(-10)} className="hover:text-gold transition-colors">
                <SkipBack className="w-5 h-5" />
              </button>
              
              <button onClick={() => skipTime(10)} className="hover:text-gold transition-colors">
                <SkipForward className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 ml-2">
                <button onClick={toggleMute} className="hover:text-gold transition-colors">
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-20"
                />
              </div>

              <span className="text-sm ml-4">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:text-gold">
                    {playbackRate}x
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Oynatma Hızı</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <DropdownMenuItem key={rate} onClick={() => changePlaybackRate(rate)}>
                      {rate}x {rate === playbackRate && "✓"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <button onClick={toggleFullscreen} className="hover:text-gold transition-colors">
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;