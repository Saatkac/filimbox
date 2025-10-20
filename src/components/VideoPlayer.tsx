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

  useEffect(() => {
    if (!videoRef.current || !src) return;

    const video = videoRef.current;
    setError(null);

    // Determine the video format
    const isHLS = src.includes(".m3u8") || src.includes(".m3u");
    const isDASH = src.includes(".mpd");
    const isMP4 = src.includes(".mp4");

    try {
      if (isHLS && Hls.isSupported()) {
        // HLS.js for .m3u8 streams
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        
        hls.loadSource(src);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("HLS manifest loaded");
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            setError("Video yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
            console.error("HLS Error:", data);
          }
        });

        return () => {
          hls.destroy();
        };
      } else if (isDASH) {
        // DASH.js for .mpd streams
        const player = dashjs.MediaPlayer().create();
        player.initialize(video, src, true);
        
        player.on('error', (e: any) => {
          setError("Video yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
          console.error("DASH Error:", e);
        });

        return () => {
          player.destroy();
        };
      } else if (isMP4 || video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native support for MP4 or Safari HLS
        video.src = src;
        video.load();
      } else {
        setError("Bu video formatı desteklenmiyor.");
      }
    } catch (err) {
      setError("Video oynatıcı başlatılırken bir hata oluştu.");
      console.error("Video Player Error:", err);
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
        >
          Tarayıcınız video oynatmayı desteklemiyor.
        </video>
      )}
    </div>
  );
};

export default VideoPlayer;
