// Deno Edge Function: HLS Proxy with manifest rewrite
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, apikey",
};

serve(async (req) => {
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

    const upstream = await fetch(targetUrl.toString(), {
      // Some CDNs require a browsery UA to serve HLS
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      redirect: "follow",
    });

    const contentType = upstream.headers.get("content-type") || "";
    const headers = new Headers(corsHeaders);
    if (contentType) headers.set("content-type", contentType);

    // If it's a playlist, rewrite segment URLs via the proxy
    const isM3U8 = contentType.toLowerCase().includes("mpegurl") || targetUrl.pathname.endsWith(".m3u8");

    if (isM3U8) {
      const text = await upstream.text();
      const base = targetUrl;
      const proxyBase = new URL(req.url);
      const proxyPrefix = `${proxyBase.origin}/functions/v1/hls-proxy?url=`;

      const rewritten = text
        .split(/\r?\n/)
        .map((line) => {
          const l = line.trim();
          if (!l || l.startsWith("#")) return line; // keep tags and comments exactly
          try {
            const absolute = new URL(l, base).toString();
            return `${proxyPrefix}${encodeURIComponent(absolute)}`;
          } catch {
            return line; // leave as is if URL parsing fails
          }
        })
        .join("\n");

      return new Response(rewritten, { headers });
    }

    // For segments or other assets, just stream through
    const body = await upstream.arrayBuffer();
    return new Response(body, { headers });
  } catch (e) {
    return new Response(`Proxy error: ${e}`, { status: 500, headers: corsHeaders });
  }
});
