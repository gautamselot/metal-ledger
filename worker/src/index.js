export default {
  async fetch(req, env) {
    const h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
    const out = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });
    if (!env.PASSWORD || req.headers.get('Authorization') !== `Bearer ${env.PASSWORD}`) return out({ error: 'auth' }, 401);
    const p = new URL(req.url).pathname;
    if (p === '/api/all') {
      const { results } = await env.DB.prepare('SELECT k, v, rev FROM kv').all();
      return out({ items: results });
    }
    if (p === '/api/save' && req.method === 'POST') {
      const { changes } = await req.json();
      const rs = await env.DB.batch(changes.map((c) => c.baseRev === 0
        ? env.DB.prepare('INSERT INTO kv (k, v, rev) VALUES (?1, ?2, 1) ON CONFLICT(k) DO NOTHING').bind(c.k, c.v)
        : env.DB.prepare('UPDATE kv SET v = ?2, rev = rev + 1 WHERE k = ?1 AND rev = ?3').bind(c.k, c.v, c.baseRev)));
      const revs = {}, conflicts = [];
      rs.forEach((r, i) => (r.meta.changes ? (revs[changes[i].k] = changes[i].baseRev + 1) : conflicts.push(changes[i].k)));
      return out({ revs, conflicts });
    }
    return out({ error: 'not found' }, 404);
  },
};