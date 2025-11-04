// Deno Edge Function: HLS Proxy with manifest rewriting and CORS
// Proxies HLS (.m3u8) manifests and media segments, rewriting relative URIs
// so that all subsequent requests also go through this proxy.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function badRequest(msg: string, status = 400) {
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders } });
  }

  const sourceUrl = urlObj.searchParams.get('url');
  if (!sourceUrl) return badRequest('Missing url parameter');
  if (!isValidUrl(sourceUrl)) return badRequest('Invalid or blocked url');

  const proxyBase = `${urlObj.origin}${urlObj.pathname}`;

  try {
    const src = new URL(sourceUrl);
    const upstream = await fetch(sourceUrl, {
      method: 'GET',
      headers: {
        // Forward important headers (range for partial content)
        'Range': req.headers.get('Range') ?? '',
        // Spoof a common UA if missing
        'User-Agent': req.headers.get('User-Agent') ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        // Force upstream-friendly headers
        'Referer': `${src.origin}/`,
        'Origin': src.origin,
        'Accept': req.headers.get('Accept') ?? '*/*',
        'Accept-Encoding': req.headers.get('Accept-Encoding') ?? '',
        'Accept-Language': req.headers.get('Accept-Language') ?? '',
      },
      redirect: 'follow',
    });

    const contentType = upstream.headers.get('content-type') || '';

    // If manifest (m3u8), rewrite
    const isM3U8 = /application\/(vnd\.apple\.)?mpegurl|audio\/mpegurl|\.m3u8(\b|$)/i.test(contentType) || /\.m3u8(\?|$)/i.test(sourceUrl);

    if (isM3U8) {
      const text = await upstream.text();
      const body = rewriteM3U8(text, sourceUrl, proxyBase);
      const headers = new Headers({
        ...corsHeaders,
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
      return new Response(body, { status: upstream.status, headers });
    }

    // Otherwise, stream as-is and add CORS
    const passthroughHeaders = new Headers(upstream.headers);
    passthroughHeaders.set('Access-Control-Allow-Origin', '*');
    passthroughHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    passthroughHeaders.set('Access-Control-Allow-Headers', '*');

    return new Response(upstream.body, {
      status: upstream.status,
      headers: passthroughHeaders,
    });
  } catch (e) {
    return badRequest('Upstream fetch failed', 502);
  }
});
