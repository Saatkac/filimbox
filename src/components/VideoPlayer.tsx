import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import * as dashjs from "dashjs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";


interface VideoPlayerProps {
  src: string;
  poster?: string;
}

const VideoPlayer = ({ src, poster }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

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
  }, [src]);

  return (
    <div className="relative w-full bg-black rounded-lg overflow-hidden">
      {error ? (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <video
          ref={videoRef}
          controls
          poster={poster}
          className="w-full aspect-video"
          controlsList="nodownload"
          crossOrigin="anonymous"
          preload="metadata"
        >
          Tarayıcınız video oynatmayı desteklemiyor.
        </video>
      )}
    </div>
  );
};

export default VideoPlayer;
