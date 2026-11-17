// The roar cloud: a tiny Cloudflare Worker + R2 bucket so a roar recorded on
// any phone lands in the family library everywhere. Uploads need the family
// key; listening is public (the URLs are unguessable enough for a toddler's
// roar collection, and nothing personal is stored - just roars).

const FAMILY = 'harding';
const ALLOWED_ORIGINS = [
  'https://chriskharding.github.io',
  'http://localhost:5180',
];

const cors = (origin) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-bear-key',
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin') ?? '';
    const headers = cors(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    // GET /roars -> ["sfx:roar:extra:7", ...]
    if (request.method === 'GET' && url.pathname === '/roars') {
      const list = await env.ROARS.list({ prefix: `${FAMILY}/` });
      const ids = list.objects.map((o) => o.key.slice(FAMILY.length + 1));
      return Response.json(ids, { headers });
    }

    // GET /roar/<id> -> the audio
    if (request.method === 'GET' && url.pathname.startsWith('/roar/')) {
      const id = decodeURIComponent(url.pathname.slice('/roar/'.length));
      const obj = await env.ROARS.get(`${FAMILY}/${id}`);
      if (!obj) return new Response('not found', { status: 404, headers });
      return new Response(obj.body, {
        headers: {
          ...headers,
          'content-type': obj.httpMetadata?.contentType ?? 'audio/wav',
          'cache-control': 'public, max-age=300',
        },
      });
    }

    // PUT /roar/<id> (audio body, x-bear-key header) -> stored
    if (request.method === 'PUT' && url.pathname.startsWith('/roar/')) {
      if (request.headers.get('x-bear-key') !== env.BEAR_KEY) {
        return new Response('nope', { status: 403, headers });
      }
      const id = decodeURIComponent(url.pathname.slice('/roar/'.length));
      if (!/^sfx:roar:[a-z0-9:_-]+$/i.test(id)) {
        return new Response('bad id', { status: 400, headers });
      }
      const body = await request.arrayBuffer();
      if (body.byteLength > 2_000_000) {
        return new Response('too big', { status: 413, headers });
      }
      await env.ROARS.put(`${FAMILY}/${id}`, body, {
        httpMetadata: { contentType: request.headers.get('content-type') ?? 'audio/wav' },
      });
      return Response.json({ ok: true }, { headers });
    }

    return new Response('abc bear roar cloud 🐻', { headers });
  },
};
