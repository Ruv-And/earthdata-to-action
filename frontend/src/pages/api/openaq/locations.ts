import type { NextApiRequest, NextApiResponse } from "next";

type CacheEntry = { expires: number; data: any };

const cache = new Map<string, CacheEntry>();
const LIST_TTL = 60 * 1000; // 60s

function buildCacheKey(req: NextApiRequest) {
  // keep only relevant query params so cache keys are stable
  const allowed = [
    "q",
    "page",
    "limit",
    "country",
    "city",
    "coordinates",
    "radius",
    "sort",
    "order_by",
    "parameter",
    "name",
    "location",
  ];
  const params = new URLSearchParams();
  for (const p of allowed) {
    const v = req.query[p];
    if (v) params.set(p, String(v));
  }
  return params.toString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.OPENAQ_API_KEY) {
    return res.status(500).json({ error: "Server missing OPENAQ_API_KEY environment variable" });
  }

  const key = buildCacheKey(req);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expires > now) {
    return res.status(200).json(cached.data);
  }

  const url = new URL("https://api.openaq.org/v3/locations");
  // forward allowed params
  const forward = [
    "q",
    "page",
    "limit",
    "country",
    "city",
    "coordinates",
    "radius",
    "sort",
    "order_by",
    "parameter",
    "name",
    "location",
  ];
  for (const p of forward) {
    const v = req.query[p];
    if (v) url.searchParams.set(p, String(v));
  }

  // sensible defaults
  if (!url.searchParams.has("limit")) url.searchParams.set("limit", "10");

  const headers: Record<string, string> = {};
  if (process.env.OPENAQ_API_KEY) headers["X-API-Key"] = process.env.OPENAQ_API_KEY;

  try {
    // If a query 'q' is provided, perform server-side filtering over multiple pages
    const qparam = String(req.query.q || "").trim();
    if (qparam) {
      // fetch several pages to improve match coverage, but cap to avoid excessive calls
      const perPage = Math.min(Number(url.searchParams.get("limit") || "10"), 100);
      const maxPages = 5;
      const matches: any[] = [];
      for (let page = 1; page <= maxPages; page++) {
        url.searchParams.set("page", String(page));
        url.searchParams.set("limit", String(perPage));
        const r = await fetch(url.toString(), { headers });
        if (!r.ok) {
          const text = await r.text();
          if (r.status === 401) return res.status(401).json({ error: "OpenAQ returned 401 Unauthorized - check your OPENAQ_API_KEY" });
          return res.status(r.status).json({ error: text || "OpenAQ error" });
        }
        const json = await r.json();
        const results = json.results || json || [];
        for (const item of results) {
          const hay = [item.name, item.city, item.country].filter(Boolean).join(" ").toLowerCase();
          if (hay.includes(qparam.toLowerCase())) matches.push(item);
        }
        // stop early if fewer results than perPage (likely last page)
        if (!json.meta || (json.results && json.results.length < perPage)) break;
      }
      const out = { results: matches };
      cache.set(key, { data: out, expires: Date.now() + LIST_TTL });
      return res.status(200).json(out);
    }

    // no q param — forward single request as before
    const r = await fetch(url.toString(), { headers });
    if (!r.ok) {
      const text = await r.text();
      if (r.status === 401) {
        return res.status(401).json({ error: "OpenAQ returned 401 Unauthorized - check your OPENAQ_API_KEY" });
      }
      return res.status(r.status).json({ error: text || "OpenAQ error" });
    }
    const json = await r.json();
    cache.set(key, { data: json, expires: Date.now() + LIST_TTL });
    return res.status(200).json(json);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
