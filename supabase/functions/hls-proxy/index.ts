// Deno Edge Function: Enhanced Video Proxy with HLS support, Range requests, and CORS
// Proxies video content (m3u8, ts segments, mp4, etc.) with proper headers

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
};

function badRequest(msg: string, status = 400) {
  console.error(`[Proxy Error] ${msg}`);
  return new Response(msg, { status, headers: { ...corsHeaders } });
}

function isValidUrl(u: string) {
  try {
    const url = new URL(u);
    if (!/^https?:$/i.test(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.startsWith("0.") ||
      host.endsWith(".local")
    ) return false;
    return true;
  } catch {
    return false;
  }
}

function getReferer(sourceUrl: string): string {
  try {
    const url = new URL(sourceUrl);
    return `${url.origin}/`;
  } catch {
    return "";
  }
}

function proxify(proxyBase: string, absoluteUrl: string) {
  return `${proxyBase}?url=${encodeURIComponent(absoluteUrl)}`;
}

function rewriteM3U8(content: string, originalUrl: string, proxyBase: string) {
  const base = new URL(originalUrl);
  const absolutize = (u: string) => new URL(u, base).href;

  // 1) Rewrite tag URIs (KEY, MEDIA, MAP, I-FRAME-STREAM-INF, etc.)
  let rewritten = content.replace(/URI="([^"]+)"/gi, (_m, p1) => {
    try {
      const abs = absolutize(p1);
      return `URI="${proxify(proxyBase, abs)}"`;
    } catch {
      return _m;
    }
  });

  // 2) Rewrite non-tag lines (child manifests or segments)
  const lines = rewritten.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    try {
      const abs = absolutize(line);
      lines[i] = proxify(proxyBase, abs);
    } catch {
      // keep as is
    }
  }
  rewritten = lines.join('\n');
  return rewritten;
}

serve(async (req: Request) => {
  const urlObj = new URL(req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: { ...corsHeaders } 
    });
  }

  // Only allow GET and HEAD
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return badRequest('Method not allowed', 405);
  }

  const sourceUrl = urlObj.searchParams.get('url');
  if (!sourceUrl) {
    return badRequest('Missing url parameter');
  }
  
  if (!isValidUrl(sourceUrl)) {
    return badRequest('Invalid or blocked url');
  }

  const proxyBase = `${urlObj.origin}${urlObj.pathname}`;
  const referer = getReferer(sourceUrl);

  console.log(`[Proxy] Request: ${req.method} ${sourceUrl.substring(0, 100)}...`);

  try {
    const src = new URL(sourceUrl);
    
    // Build request headers - forward important headers from client
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': req.headers.get('User-Agent') ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': referer,
      'Origin': src.origin,
      'Accept': req.headers.get('Accept') ?? '*/*',
    };

    // Forward Range header for seeking support
    const rangeHeader = req.headers.get('Range');
    if (rangeHeader) {
      upstreamHeaders['Range'] = rangeHeader;
      console.log(`[Proxy] Range request: ${rangeHeader}`);
    }

    // Forward Accept-Encoding
    const acceptEncoding = req.headers.get('Accept-Encoding');
    if (acceptEncoding) {
      upstreamHeaders['Accept-Encoding'] = acceptEncoding;
    }

    // Forward Accept-Language
    const acceptLanguage = req.headers.get('Accept-Language');
    if (acceptLanguage) {
      upstreamHeaders['Accept-Language'] = acceptLanguage;
    }

    const upstream = await fetch(sourceUrl, {
      method: req.method,
      headers: upstreamHeaders,
      redirect: 'follow',
    });

    console.log(`[Proxy] Upstream response: ${upstream.status} ${upstream.statusText}`);

    const contentType = upstream.headers.get('content-type') || '';
    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    const acceptRanges = upstream.headers.get('accept-ranges');

    // Check if it's an M3U8 manifest
    const isM3U8 = /application\/(vnd\.apple\.)?mpegurl|audio\/mpegurl/i.test(contentType) || 
                   /\.m3u8(\?|$)/i.test(sourceUrl);

    if (isM3U8 && req.method === 'GET') {
      // Rewrite M3U8 manifest
      const text = await upstream.text();
      const body = rewriteM3U8(text, sourceUrl, proxyBase);
      
      console.log(`[Proxy] Rewrote M3U8 manifest, ${text.length} -> ${body.length} bytes`);
      
      return new Response(body, { 
        status: upstream.status, 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      });
    }

    // For binary content (ts, mp4, jpg, gif segments, etc.), stream as-is with CORS
    const responseHeaders = new Headers();
    
    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });

    // Forward important headers from upstream
    if (contentType) {
      responseHeaders.set('Content-Type', contentType);
    }
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }
    if (acceptRanges) {
      responseHeaders.set('Accept-Ranges', acceptRanges);
    } else {
      // Indicate we support range requests
      responseHeaders.set('Accept-Ranges', 'bytes');
    }

    // Add caching for segments
    if (!isM3U8) {
      responseHeaders.set('Cache-Control', 'public, max-age=86400');
    }

    // Return 206 for range requests, otherwise use upstream status
    const status = contentRange ? 206 : upstream.status;

    // For HEAD requests, don't send body
    if (req.method === 'HEAD') {
      return new Response(null, {
        status,
        headers: responseHeaders,
      });
    }

    return new Response(upstream.body, {
      status,
      headers: responseHeaders,
    });

  } catch (e) {
    console.error(`[Proxy] Fetch error: ${e}`);
    return badRequest('Upstream fetch failed: ' + (e instanceof Error ? e.message : String(e)), 502);
  }
});
