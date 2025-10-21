// Deno Edge Function: Public HLS Proxy with manifest rewrite and CORS
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get("url");

    if (!target) {
      return new Response("Missing url parameter", { status: 400, headers: corsHeaders });
    }

    const targetUrl = new URL(target);
    console.log(`[hls-proxy] fetching: ${targetUrl.toString()}`);

    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        // Avoid credentials to prevent CORS issues on upstream
      },
      redirect: "follow",
    });

    const contentType = upstream.headers.get("content-type") || "";
    const headers = new Headers(corsHeaders);
    if (contentType) headers.set("content-type", contentType);

    const isM3U8 = contentType.toLowerCase().includes("mpegurl") || targetUrl.pathname.endsWith(".m3u8");

    if (isM3U8) {
      const text = await upstream.text();
      const base = targetUrl;
      const proxyBase = new URL(req.url);
      const proxyPrefix = `${proxyBase.origin}/functions/v1/hls-proxy?url=`;

      // Rewrite only non-comment, non-empty lines as absolute proxied URLs
      const rewritten = text
        .split(/\r?\n/)
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) return line; // keep tags
          try {
            const absolute = new URL(trimmed, base).toString();
            return `${proxyPrefix}${encodeURIComponent(absolute)}`;
          } catch {
            return line;
          }
        })
        .join("\n");

      return new Response(rewritten, { headers });
    }

    // For segments and other assets: stream bytes
    const body = await upstream.arrayBuffer();
    return new Response(body, { headers });
  } catch (e) {
    console.error("[hls-proxy] error", e);
    return new Response(`Proxy error: ${e}`, { status: 500, headers: corsHeaders });
  }
});
