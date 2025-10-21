import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import * as dashjs from "dashjs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { Slider } from "@/components/ui/slider";


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
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

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
        
        hls.loadSource(normalizedSrc);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("VideoPlayer: HLS manifest parsed successfully");
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

  // Control functions
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
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
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
    }
  };

  const toggleFullscreen = () => {
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
  };

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
      className="relative w-full bg-black rounded-lg overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
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
            className="w-full aspect-video"
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
              <div className="flex items-center justify-between gap-4">
                {/* Volume Control */}
                <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-gold transition-colors"
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
                  <span className="text-white text-xs md:text-sm font-medium min-w-[50px]">
                    {Math.round(volume * 100)}%
                  </span>
                </div>

                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="text-white hover:text-gold transition-colors"
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
        </>
      )}
    </div>
  );
};

export default VideoPlayer;
