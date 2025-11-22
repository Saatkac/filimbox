import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const videoUrl = url.searchParams.get('url');
    
    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Video URL is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[video-stream-proxy] Processing URL:', videoUrl);

    // Use yt-dlp to get the best stream URL
    const command = new Deno.Command("yt-dlp", {
      args: [
        "--no-warnings",
        "--no-check-certificate",
        "--get-url",
        "-f", "best",
        videoUrl
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await command.output();
    
    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      console.error('[video-stream-proxy] yt-dlp error:', errorText);
      
      // Fallback: try to fetch directly
      console.log('[video-stream-proxy] Falling back to direct fetch');
      const response = await fetch(videoUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }

      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': response.headers.get('Content-Type') || 'application/vnd.apple.mpegurl',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    const streamUrl = new TextDecoder().decode(stdout).trim();
    console.log('[video-stream-proxy] Got stream URL:', streamUrl);

    // Fetch the stream
    const streamResponse = await fetch(streamUrl);
    
    if (!streamResponse.ok) {
      throw new Error(`Failed to fetch stream: ${streamResponse.statusText}`);
    }

    // Return the stream
    return new Response(streamResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': streamResponse.headers.get('Content-Type') || 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('[video-stream-proxy] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
