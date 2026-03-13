import { useEffect, useRef, useState, useCallback, useMemo, memo, forwardRef, useImperativeHandle } from "react";
import Hls from "hls.js";
import * as dashjs from "dashjs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipForward, SkipBack, Loader2, Settings } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Cookie helpers
const getCookie = (name: string): string | null => {
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const part of parts) {
    const eqIndex = part.indexOf('=');
    if (eqIndex > -1) {
      const key = part.substring(0, eqIndex);
      const val = part.substring(eqIndex + 1);
      if (key === name) return decodeURIComponent(val);
    }
  }
  return null;
};
const setCookie = (name: string, value: string, days = 365) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

interface QualityLevel {
  height: number;
  bitrate: number;
  index: number;
  label: string;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  initialProgress?: number;
  onProgressUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: (time: number) => void;
  onPause?: (time: number) => void;
  onSeek?: (time: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  showQualitySelector?: boolean;
  showPlaybackSpeed?: boolean;
  showSkipControls?: boolean;
  useProxy?: boolean;
  proxyMethod?: string;
  proxyCustomUrl?: string;
}

export interface VideoPlayerRef {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ 
  src, 
  poster, 
  initialProgress = 0, 
  onProgressUpdate,
  onPlay,
  onPause,
  onSeek,
  onPlayingChange,
  showQualitySelector = true,
  showPlaybackSpeed = true,
  showSkipControls = true,
  useProxy = false,
  proxyMethod = 'builtin',
  proxyCustomUrl = ''
}, ref) => {
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
  const [isBuffering, setIsBuffering] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  const [seekTooltip, setSeekTooltip] = useState<{ show: boolean; time: number; position: number }>({ 
    show: false, 
    time: 0, 
    position: 0 
  });
  const isExternalControlRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  
  // Quality levels state
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = auto

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    play: () => {
      isExternalControlRef.current = true;
      videoRef.current?.play();
      setTimeout(() => { isExternalControlRef.current = false; }, 100);
    },
    pause: () => {
      isExternalControlRef.current = true;
      videoRef.current?.pause();
      setTimeout(() => { isExternalControlRef.current = false; }, 100);
    },
    seek: (time: number) => {
      isExternalControlRef.current = true;
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
      setTimeout(() => { isExternalControlRef.current = false; }, 100);
    }
  }), []);

  // Notify parent about playing state changes
  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);

  // Proxy URL builder - supports multiple methods
  const getProxyUrl = useCallback((url: string): string => {
    if (!useProxy) return url;
    
    switch (proxyMethod) {
      case 'builtin': {
        const proxyBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hls-proxy`;
        return `${proxyBase}?url=${encodeURIComponent(url)}`;
      }
      case 'custom_php':
      case 'custom_node':
      case 'cloudflare_worker': {
        if (!proxyCustomUrl) return url;
        // If URL ends with = or ?url=, append the video URL directly
        if (proxyCustomUrl.endsWith('=')) {
          return `${proxyCustomUrl}${encodeURIComponent(url)}`;
        }
        // Otherwise append as query parameter
        const separator = proxyCustomUrl.includes('?') ? '&' : '?';
        return `${proxyCustomUrl}${separator}url=${encodeURIComponent(url)}`;
      }
      default:
        return url;
    }
  }, [useProxy, proxyMethod, proxyCustomUrl]);

  const normalizeUrl = (u: string) => {
    if (!u) return u;
    let out = u.trim();
    // Decode HTML entities
    out = out.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    // Fix missing protocol
    if (/^ttps?:\/\//i.test(out)) out = 'h' + out;
    if (/^\/\//.test(out)) out = 'https:' + out;
    
    // Remove problematic query parameters (vt, etc.)
    try {
      const urlObj = new URL(out);
      // Remove vt and other tracking/problematic parameters
      urlObj.searchParams.delete('vt');
      urlObj.searchParams.delete('utm_source');
      urlObj.searchParams.delete('utm_medium');
      urlObj.searchParams.delete('utm_campaign');
      out = urlObj.toString();
    } catch (e) {
      // If URL parsing fails, continue with original
      console.log('[VideoPlayer] URL parse failed, using original:', out);
    }
    
    // Auto-fix common HLS URL patterns from M3U imports
    if (!/\.m3u8(\?|$)/i.test(out)) {
      if (out.endsWith('/')) out = out + 'index.m3u8';
      if (/\/main\/?$/i.test(out)) out = out.replace(/\/main\/?$/i, '/main/index.m3u8');
      if (/\/master$/i.test(out)) out = out + '.m3u8';
    }
    
    console.log('[VideoPlayer] Normalized URL:', out);
    return out;
  };

  const getHlsCandidates = (u: string): string[] => {
    const url = u.trim();
    const list: string[] = [];
    const push = (x: string) => { if (!list.includes(x)) list.push(x); };

    if (/\.m3u8(\?|$)/i.test(url)) return [url];

    // Trailing slash like /vs/ttxxxx/ -> try fetching master playlist
    if (url.endsWith('/')) {
      push(url + 'master.m3u8');
      push(url + 'index.m3u8');
      push(url + '720.m3u8');
    }

    // "/main" endings
    if (/\/main\/?$/i.test(url)) {
      push(url.replace(/\/main\/?$/i, '/main/master.m3u8'));
      push(url.replace(/\/main\/?$/i, '/main/index.m3u8'));
      push(url.replace(/\/main\/?$/i, '/main/720.m3u8'));
    }

    // "master" without extension
    if (/\/master$/i.test(url) && !/\.m3u8(\?|$)/i.test(url)) {
      push(url + '.m3u8');
    }

    return list.length ? list : [url];
  };

  // Prefer Turkish audio track when available (Hls.js)
  const selectTurkish = (hls: Hls) => {
    try {
      const tracks = (hls as any).audioTracks as Array<any> | undefined;
      if (!tracks || !tracks.length) return;
      let idx = tracks.findIndex(t => (t.lang || '').toLowerCase() === 'tr' || (t.name || '').toLowerCase().includes('türk'));
      if (idx < 0) idx = tracks.findIndex(t => t.default);
      if (idx >= 0) (hls as any).audioTrack = idx;
    } catch {}
  };

  useEffect(() => {
    if (!videoRef.current || !src) return;

    const videoElement = videoRef.current;
    const cleanSrc = normalizeUrl(src);
    console.log('[VideoPlayer] Initializing with:', cleanSrc);
    setError(null);
    setIsReady(false);

    // Check if it's a direct video file (mp4, webm, mkv, avi, mov, etc.)
    const videoExtensions = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'ogv', 'ogg', 'm4v', 'flv', 'wmv', '3gp'];
    const urlPath = cleanSrc.split('?')[0].toLowerCase();
    const isDirectVideo = videoExtensions.some(ext => urlPath.endsWith(`.${ext}`));
    
    if (isDirectVideo) {
      console.log('[VideoPlayer] Direct video file detected:', cleanSrc);
      // Direct video playback (including MKV, AVI, etc.) - use proxy if enabled
      const videoUrl = useProxy ? getProxyUrl(cleanSrc) : cleanSrc;
      console.log('[VideoPlayer] Using video URL:', videoUrl);
      videoElement.src = videoUrl;
      
      const handleLoadedMetadata = () => {
        console.log('[VideoPlayer] Direct video loaded, duration:', videoElement.duration);
        setIsReady(true);
        setDuration(videoElement.duration);
        if (initialProgress > 0) {
          videoElement.currentTime = initialProgress;
        }
      };
      
      const handleError = (e: Event) => {
        console.error('[VideoPlayer] Direct video error:', e);
        setError('Video yüklenemedi. Tarayıcınız bu formatı desteklemiyor olabilir. (.mkv dosyaları için Chrome veya Edge kullanın)');
      };
      
      const handleCanPlay = () => {
        console.log('[VideoPlayer] Direct video can play');
        setIsReady(true);
        setIsBuffering(false);
      };
      
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('error', handleError);
      videoElement.addEventListener('canplay', handleCanPlay);
      
      return () => {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('error', handleError);
        videoElement.removeEventListener('canplay', handleCanPlay);
      };
      
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: false,
        // Optimized buffer settings for smoother playback
        backBufferLength: 60,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxBufferSize: 120 * 1000 * 1000,
        maxBufferHole: 0.3,
        highBufferWatchdogPeriod: 3,
        nudgeMaxRetry: 10,
        // Better fragment loading
        fragLoadingTimeOut: 30000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        manifestLoadingTimeOut: 20000,
        manifestLoadingMaxRetry: 4,
        levelLoadingTimeOut: 20000,
        levelLoadingMaxRetry: 4,
        // Optimize for mobile
        startLevel: -1,
        abrEwmaDefaultEstimate: 500000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
          xhr.timeout = 30000;
        }
      });

      hlsRef.current = hls;
      // Use proxy URL if enabled
      const hlsUrl = useProxy ? getProxyUrl(cleanSrc) : cleanSrc;
      console.log('[VideoPlayer] Loading HLS from:', hlsUrl);
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('[VideoPlayer] Ready, levels:', data.levels.length);
        setIsReady(true);
        retryCountRef.current = 0;
        
        // Extract quality from URL first (e.g., 1080p in filename)
        const urlQualityMatch = cleanSrc.match(/(\d{3,4})p/i);
        const urlQuality = urlQualityMatch ? parseInt(urlQualityMatch[1]) : null;
        
        // Extract quality levels
        if (data.levels && data.levels.length > 0) {
          const levels: QualityLevel[] = data.levels.map((level: any, index: number) => {
            // Priority: URL quality > level.height > bitrate estimation
            let height = level.height || 0;
            
            // If URL has quality info and level height is 0 or very different, use URL quality
            if (urlQuality && (height === 0 || Math.abs(height - urlQuality) > 200)) {
              height = urlQuality;
            }
            
            // If still no height, estimate from bitrate
            if (height === 0 && level.bitrate) {
              if (level.bitrate > 5000000) height = 1080;
              else if (level.bitrate > 2500000) height = 720;
              else if (level.bitrate > 1000000) height = 480;
              else if (level.bitrate > 500000) height = 360;
              else height = 240;
            }
            
            // Determine label based on height
            let label: string;
            if (height >= 2160) label = '4K';
            else if (height >= 1080) label = '1080p';
            else if (height >= 720) label = '720p';
            else if (height >= 480) label = '480p';
            else if (height >= 360) label = '360p';
            else label = '240p';
            
            return {
              height,
              bitrate: level.bitrate || 0,
              index,
              label
            };
          });
          
          // Remove duplicates by label and sort by height descending
          const uniqueLevels = levels.reduce((acc: QualityLevel[], curr) => {
            if (!acc.find(l => l.label === curr.label)) {
              acc.push(curr);
            }
            return acc;
          }, []);
          uniqueLevels.sort((a, b) => b.height - a.height);
          
          // If only one level and URL has quality, show that
          if (uniqueLevels.length === 1 && urlQuality) {
            let label: string;
            if (urlQuality >= 2160) label = '4K';
            else if (urlQuality >= 1080) label = '1080p';
            else if (urlQuality >= 720) label = '720p';
            else if (urlQuality >= 480) label = '480p';
            else if (urlQuality >= 360) label = '360p';
            else label = '240p';
            uniqueLevels[0].height = urlQuality;
            uniqueLevels[0].label = label;
          }
          
          setQualityLevels(uniqueLevels);
        } else if (urlQuality) {
          // No levels from manifest but URL has quality
          let label: string;
          if (urlQuality >= 2160) label = '4K';
          else if (urlQuality >= 1080) label = '1080p';
          else if (urlQuality >= 720) label = '720p';
          else if (urlQuality >= 480) label = '480p';
          else if (urlQuality >= 360) label = '360p';
          else label = '240p';
          
          setQualityLevels([{
            height: urlQuality,
            bitrate: 0,
            index: 0,
            label
          }]);
        }
        
        if (initialProgress > 0) {
          setTimeout(() => {
            videoElement.currentTime = initialProgress;
          }, 100);
        }
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        setIsBuffering(false);
      });
      
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log('[VideoPlayer] Quality switched to level:', data.level);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('[VideoPlayer] Error:', data.type, data.details);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCountRef.current < maxRetries) {
                retryCountRef.current++;
                console.log(`[VideoPlayer] Network error, retry ${retryCountRef.current}/${maxRetries}`);
                setTimeout(() => hls.startLoad(), 2000);
              } else {
                setError('Bağlantı hatası. Lütfen sayfayı yenileyin.');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[VideoPlayer] Recovering from media error');
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setIsReady(false);
              setError('Video yüklenemedi. Lütfen tekrar deneyin.');
              break;
          }
        }
      });

    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS - use proxy if enabled
      const hlsUrl = useProxy ? getProxyUrl(cleanSrc) : cleanSrc;
      videoElement.src = hlsUrl;
      setIsReady(true);
    }


    // Video event listeners
    const handleTimeUpdate = () => {
      if (videoElement) {
        setCurrentTime(videoElement.currentTime);
        if (onProgressUpdate) {
          onProgressUpdate(videoElement.currentTime, videoElement.duration || 0);
        }
      }
    };

    const handleLoadedMetadata = () => {
      if (videoElement) {
        setDuration(videoElement.duration);
        if (hlsRef.current) {
          selectTurkish(hlsRef.current);
        }
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      if (!isExternalControlRef.current && videoRef.current) {
        onPlay?.(videoRef.current.currentTime);
      }
    };
    const handlePause = () => {
      setIsPlaying(false);
      if (!isExternalControlRef.current && videoRef.current) {
        onPause?.(videoRef.current.currentTime);
      }
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    const handleStalled = () => {
      setIsBuffering(true);
      // Try to recover from stalled state
      if (hlsRef.current) {
        setTimeout(() => {
          hlsRef.current?.startLoad();
        }, 1000);
      }
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('waiting', handleWaiting);
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('stalled', handleStalled);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('waiting', handleWaiting);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('stalled', handleStalled);
      
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [src, initialProgress, useProxy, getProxyUrl]);

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

  const changeQuality = useCallback((levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentQuality(levelIndex);
      console.log('[VideoPlayer] Quality changed to level:', levelIndex);
    }
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
      if (!isExternalControlRef.current) {
        onSeek?.(value[0]);
      }
    }
  }, [onSeek]);
  
  const handleSeekHover = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    const position = (x / rect.width) * 100;
    setSeekTooltip({ show: true, time, position });
  }, [duration]);
  
  const handleSeekLeave = useCallback(() => {
    setSeekTooltip({ show: false, time: 0, position: 0 });
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

  // Initial controls visibility timeout - runs once on mount
  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

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
  }, [isFullscreen]);

  // Sync fullscreen state with browser
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard controls - works in fullscreen too
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // In fullscreen mode, always handle keys regardless of focus
      const isFullscreenActive = !!document.fullscreenElement;
      const hasFocus = containerRef.current?.contains(document.activeElement) || 
                       document.activeElement === containerRef.current ||
                       document.activeElement === document.body;
      
      // If we're in fullscreen OR the container has focus, handle keys
      if (!isFullscreenActive && !hasFocus) return;
      
      // Don't handle if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') return;
      
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          e.stopPropagation();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          e.stopPropagation();
          skipTime(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          e.stopPropagation();
          skipTime(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          if (volume < 6) handleVolumeChange([Math.min(volume + 0.2, 6)]);
          break;
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          if (volume > 0) handleVolumeChange([Math.max(volume - 0.2, 0)]);
          break;
        case 'f':
          e.preventDefault();
          e.stopPropagation();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          e.stopPropagation();
          toggleMute();
          break;
        case 'Escape':
          // Let browser handle escape for exiting fullscreen
          break;
      }
    };

    // Use capture phase to catch events before they bubble
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
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
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
      }}
      tabIndex={0}
    >
      {error ? (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription dangerouslySetInnerHTML={{ __html: error }} />
        </Alert>
      ) : (
        <>
          <video
            ref={videoRef}
            poster={poster}
            className="w-full h-full max-h-[100vh] object-contain"
            crossOrigin={useProxy ? "anonymous" : undefined}
            preload="auto"
            playsInline
            onClick={togglePlay}
          >
            Tarayıcınız video oynatmayı desteklemiyor.
          </video>

          {/* Loading Indicator */}
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-gold animate-spin" />
                <div className="text-gold text-lg">Video hazırlanıyor...</div>
              </div>
            </div>
          )}

          {/* Buffering Indicator */}
          {isBuffering && isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-12 h-12 text-gold animate-spin" />
                <div className="text-gold text-sm">Yükleniyor...</div>
              </div>
            </div>
          )}

          {/* Custom Controls */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Center Play/Pause Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              {!isBuffering && (
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gold/90 hover:bg-gold active:scale-95 flex items-center justify-center transition-all hover:scale-110 touch-manipulation"
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-black" />
                  ) : (
                    <Play className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-black ml-1" />
                  )}
                </button>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 space-y-2">
              {/* Progress Bar */}
              <div className="flex items-center gap-2">
                <span className="text-white text-xs md:text-sm font-medium min-w-[45px]">
                  {formatTime(currentTime)}
                </span>
                <div 
                  className="flex-1 relative"
                  onMouseMove={handleSeekHover}
                  onMouseLeave={handleSeekLeave}
                >
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="w-full"
                  />
                  {seekTooltip.show && (
                    <div 
                      className="absolute -top-10 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap"
                      style={{ left: `${seekTooltip.position}%`, transform: 'translateX(-50%)' }}
                    >
                      {formatTime(seekTooltip.time)}
                    </div>
                  )}
                </div>
                <span className="text-white text-xs md:text-sm font-medium min-w-[45px]">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between gap-2 md:gap-4">
                {/* Left Side Controls */}
                <div className="flex items-center gap-2 md:gap-3">
                  {/* Skip Backward */}
                  {showSkipControls && (
                    <button
                      onClick={() => skipTime(-5)}
                      className="text-white hover:text-gold transition-colors"
                      title="5 saniye geri"
                    >
                      <SkipBack className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  )}

                  {/* Skip Forward */}
                  {showSkipControls && (
                    <button
                      onClick={() => skipTime(5)}
                      className="text-white hover:text-gold transition-colors"
                      title="5 saniye ileri"
                    >
                      <SkipForward className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  )}

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
                  {/* Quality Selector */}
                  {showQualitySelector && qualityLevels.length > 1 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-white hover:text-gold hover:bg-white/10 h-8 px-2 text-xs md:text-sm"
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          {currentQuality === -1 ? 'Otomatik' : qualityLevels.find(q => q.index === currentQuality)?.label || 'Kalite'}
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
                        {qualityLevels.map((level) => (
                          <DropdownMenuItem
                            key={level.index}
                            onClick={() => changeQuality(level.index)}
                            className="text-white hover:text-gold hover:bg-gold/10 cursor-pointer"
                          >
                            {currentQuality === level.index && "✓ "}{level.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Playback Speed */}
                  {showPlaybackSpeed && (
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
});

VideoPlayer.displayName = 'VideoPlayer';

export default memo(VideoPlayer);
