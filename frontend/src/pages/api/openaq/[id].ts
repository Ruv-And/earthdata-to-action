import type { NextApiRequest, NextApiResponse } from "next";

type CacheEntry = { expires: number; data: any };

const cache = new Map<string, CacheEntry>();
const DETAIL_TTL = 5 * 60 * 1000; // 5 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing id" });

  if (!process.env.OPENAQ_API_KEY) {
    return res.status(500).json({ error: "Server missing OPENAQ_API_KEY environment variable" });
  }

  const key = `detail:${String(id)}:${JSON.stringify(req.query)}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expires > now) return res.status(200).json(cached.data);

  // fetch location detail
  const url = new URL(`https://api.openaq.org/v3/locations/${encodeURIComponent(String(id))}`);

  const headers: Record<string, string> = {};
  if (process.env.OPENAQ_API_KEY) headers["X-API-Key"] = process.env.OPENAQ_API_KEY;

  try {
    const r = await fetch(url.toString(), { headers });
    if (!r.ok) {
      const text = await r.text();
      if (r.status === 401) {
        return res.status(401).json({ error: "OpenAQ returned 401 Unauthorized - check your OPENAQ_API_KEY" });
      }
      return res.status(r.status).json({ error: text || "OpenAQ error" });
    }
    const json = await r.json();

    // optionally fetch measurements if ?measurements=true
    if (req.query.measurements === "true") {
      const mUrl = new URL("https://api.openaq.org/v3/measurements");
      mUrl.searchParams.set("limit", String(req.query.limit || "20"));
      mUrl.searchParams.set("location_id", String(id));
      const mr = await fetch(mUrl.toString(), { headers });
      if (mr.ok) {
        json.measurements = await mr.json();
      } else {
        if (mr.status === 401) {
          json.measurements = { error: "OpenAQ measurements returned 401 Unauthorized - check API key" };
        } else {
          json.measurements = { error: `measurements fetch ${mr.status}` };
        }
      }
    }

    cache.set(key, { data: json, expires: Date.now() + DETAIL_TTL });
    return res.status(200).json(json);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
