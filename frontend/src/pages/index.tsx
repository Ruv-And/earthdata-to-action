import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import { useEffect, useState, useRef } from "react";

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type Location = {
  id: number;
  name: string;
  city?: string;
  country?: string;
  coordinates?: { latitude?: number; longitude?: number };
  parameters?: Array<{ parameter: string }>;
};

export default function Home() {
  const [q, setQ] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Location | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    // debounce search
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!q) {
      setLocations([]);
      setSelected(null);
      return;
    }
    setLoading(true);
    setError(null);
    debounceRef.current = window.setTimeout(async () => {
      try {
        // Use a relative URL so it works in dev and production
        const url = `/api/openaq/locations?q=${encodeURIComponent(q)}&limit=10`;
        const r = await fetch(url);
        const json = await r.json();
        if (!r.ok) {
          // server returned error object
          setError(json?.error || `Request failed: ${r.status}`);
          setLocations([]);
        } else if (json?.results) {
          setLocations(json.results || []);
        } else if (Array.isArray(json)) {
          // fallback if API returns an array
          setLocations(json as any);
        } else {
          setLocations([]);
        }
      } catch (err) {
        console.error(err);
        setError(String(err));
        setLocations([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q]);

  async function fetchDetail(id: number) {
    try {
      const r = await fetch(`/api/openaq/${id}?measurements=true&limit=20`);
      const json = await r.json();
      if (!r.ok) {
        setError(json?.error || `Detail request failed: ${r.status}`);
        return;
      }
      setSelected(json as any);
    } catch (err) {
      console.error(err);
      setError(String(err));
    }
  }

  async function fetchNearby(lat: number, lon: number, radius = 25000) {
    setError(null);
    setLoading(true);
    setSelected(null);
    try {
      const r = await fetch(`/api/openaq/locations?coordinates=${lat},${lon}&radius=${radius}&limit=100`);
      const json = await r.json();
      if (!r.ok) {
        setError(json?.error || `Nearby request failed: ${r.status}`);
        setLocations([]);
      } else {
        const results = json.results || [];
        const withDist = results.map((it: any) => {
          if (it.coordinates && it.coordinates.latitude && it.coordinates.longitude) {
            const d = haversine(lat, lon, it.coordinates.latitude, it.coordinates.longitude);
            return { ...it, __distance: d };
          }
          return { ...it, __distance: Infinity };
        });
        withDist.sort((a: any, b: any) => (a.__distance || 0) - (b.__distance || 0));
        setLocations(withDist);
      }
    } catch (err) {
      console.error(err);
      setError(String(err));
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }

  function haversine(aLat: number, aLon: number, bLat: number, bLon: number) {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371e3; // meters
    const φ1 = toRad(aLat), φ2 = toRad(bLat);
    const Δφ = toRad(bLat - aLat), Δλ = toRad(bLon - aLon);
    const x = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  }

  return (
    <div
      className={`${geistSans.className} ${geistMono.className} font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20`}
    >
      <main className="flex flex-col gap-[24px] row-start-2 items-center sm:items-start w-full max-w-4xl">
        <h1 className="text-2xl font-semibold">OpenAQ location search</h1>

        <div className="w-full flex gap-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
            placeholder="Search locations by name, city, or parameter..."
            aria-label="Search locations"
          />
          <button
            onClick={() => {
              setQ("");
              setLocations([]);
            }}
            className="px-3 py-2 border rounded"
          >
            Clear
          </button>
          <button
            onClick={() => {
              if (!navigator.geolocation) return setError("Geolocation not supported by this browser");
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const lat = pos.coords.latitude;
                  const lon = pos.coords.longitude;
                  fetchNearby(lat, lon, 25000);
                },
                (err) => {
                  console.error(err);
                  setError("Unable to retrieve your location");
                }
              );
            }}
            className="px-3 py-2 border rounded"
          >
            {loading ? <Spinner size={14} /> : "Use my location"}
          </button>
          <button
            onClick={() => setManualModalOpen(true)}
            className="px-3 py-2 border rounded"
          >
            Enter coords
          </button>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1 md:col-span-1">
            <div className="bg-white/5 p-3 rounded border h-[400px] overflow-auto">
              {loading && <div className="mb-2">Searching...</div>}
              {error && <div className="text-sm text-red-400 mb-2">{error}</div>}
              {!loading && !error && locations.length === 0 && q && <div>No results</div>}
              <ul>
                {locations.map((loc: any) => (
                  <li
                    key={loc.id}
                    className="p-2 border-b last:border-b-0 hover:bg-slate-50/5 cursor-pointer"
                    onClick={() => fetchDetail(loc.id)}
                  >
                    <div className="font-medium">{loc.name}</div>
                    <div className="text-sm text-muted-foreground flex justify-between">
                      <span>
                        {loc.city || ""} {loc.country ? `(${loc.country})` : ""}
                      </span>
                      <span className="text-xs text-gray-400">
                        {loc.__distance && isFinite(loc.__distance) ? `${Math.round(loc.__distance / 1000)} km` : ""}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <div className="bg-white/5 p-4 rounded border min-h-[400px]">
              {!selected && <div>Select a location to see details</div>}
              {selected && (
                <div>
                  <h2 className="text-xl font-semibold">{selected.name}</h2>
                  <div className="text-sm text-muted-foreground mb-2">
                    {selected.city} {selected.country ? `(${selected.country})` : ""}
                  </div>
                  <pre className="text-xs max-h-[300px] overflow-auto bg-black/5 p-2 rounded">
                    {JSON.stringify(selected, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Manual coords modal */}
        {manualModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-[420px]">
              <h3 className="text-lg font-semibold mb-2">Enter coordinates</h3>
              <div className="flex flex-col gap-2">
                <input className="border px-2 py-1" placeholder="Latitude" value={manualLat} onChange={(e) => setManualLat(e.target.value)} />
                <input className="border px-2 py-1" placeholder="Longitude" value={manualLon} onChange={(e) => setManualLon(e.target.value)} />
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button className="px-3 py-2 border rounded" onClick={() => setManualModalOpen(false)}>Cancel</button>
                <button
                  className="px-3 py-2 border rounded"
                  onClick={() => {
                    const lat = Number(manualLat);
                    const lon = Number(manualLon);
                    if (!isFinite(lat) || !isFinite(lon)) return setError("Invalid coordinates");
                    if (lat < -90 || lat > 90) return setError("Latitude must be between -90 and 90");
                    if (lon < -180 || lon > 180) return setError("Longitude must be between -180 and 180");
                    setManualModalOpen(false);
                    setError(null);
                    fetchNearby(lat, lon, 25000);
                  }}
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://openaq.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn about OpenAQ
        </a>
      </footer>
    </div>
  );
}
