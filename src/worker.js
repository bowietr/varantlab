import { parseQuotes, SOURCE } from './parser.js';
const json = (body, status = 200) => Response.json(body, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (request.method !== 'GET') return json({error:'Yalnızca GET desteklenir.'}, 405);
    if (url.pathname === '/api/health') return json({ok:true, version:'0.2.0'});
    if (url.pathname !== '/api/quotes') return json({error:'Bulunamadı.'}, 404);
    // Cache one upstream read per edge location for five minutes.
    const cacheKey = new Request(`${url.origin}/internal/quotes-v2`);
    const cached = await caches.default.match(cacheKey);
    if (cached) return json({...await cached.json(), cached:true});
    try {
      const upstream = await fetch(SOURCE, {signal:AbortSignal.timeout(15000), headers:{Accept:'text/html'}});
      if (!upstream.ok) throw new Error(`Kaynak yanıtı: ${upstream.status}`);
      const quotes = parseQuotes(await upstream.text());
      const payload = {source:'İnfo Varant', sourceUrl:SOURCE, delayMinutes:15, fetchedAt:new Date().toISOString(), quoteTime:null, scope:'İnfo Varant kaynağının tam listesi; tüm ihraççıları kapsamaz.', total:quotes.length, underlyingCount:new Set(quotes.map(q=>q.underlying)).size, quotes};
      ctx.waitUntil(caches.default.put(cacheKey, Response.json(payload, {headers:{'Cache-Control':'public, max-age=300'}})));
      return json({...payload, cached:false});
    } catch (error) {
      console.error('quotes_fetch_failed', error.message);
      return json({error:'Gerçek veri kaynağına ulaşılamadı. Biraz sonra tekrar deneyin.'}, 502);
    }
  }
};
