/** Live USDT→PKR from public market feeds (no API key). USDT ≈ USD when needed. */

export type LiveUsdtPkr = {
  rate: number;
  source: string;
  at: string;
};

type CacheEntry = { rate: number; source: string; fetchedAt: number };

let cache: CacheEntry | null = null;
const TTL_MS = 10 * 60 * 1000;

function roundRate(n: number) {
  return Number(n.toFixed(2));
}

function validRate(n: unknown): number | null {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 50 || v > 1000) return null;
  return roundRate(v);
}

async function fromUsdtCdn(): Promise<LiveUsdtPkr | null> {
  const res = await fetch(
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usdt.min.json",
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { usdt?: { pkr?: number }; date?: string };
  const rate = validRate(data?.usdt?.pkr);
  if (!rate) return null;
  return { rate, source: "market USDT/PKR", at: data?.date || new Date().toISOString() };
}

async function fromUsdOpenEr(): Promise<LiveUsdtPkr | null> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { rates?: { PKR?: number }; time_last_update_utc?: string };
  const rate = validRate(data?.rates?.PKR);
  if (!rate) return null;
  return {
    rate,
    source: "market USD/PKR (USDT≈USD)",
    at: data?.time_last_update_utc || new Date().toISOString(),
  };
}

async function fromCloudflarePages(): Promise<LiveUsdtPkr | null> {
  const res = await fetch("https://latest.currency-api.pages.dev/v1/currencies/usdt.min.json", {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { usdt?: { pkr?: number }; date?: string };
  const rate = validRate(data?.usdt?.pkr);
  if (!rate) return null;
  return { rate, source: "market USDT/PKR", at: data?.date || new Date().toISOString() };
}

export async function fetchLiveUsdtPkrRate(force = false): Promise<LiveUsdtPkr | null> {
  if (!force && cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return {
      rate: cache.rate,
      source: cache.source,
      at: new Date(cache.fetchedAt).toISOString(),
    };
  }
  const loaders = [fromUsdtCdn, fromCloudflarePages, fromUsdOpenEr];
  for (const load of loaders) {
    try {
      const hit = await load();
      if (hit) {
        cache = { rate: hit.rate, source: hit.source, fetchedAt: Date.now() };
        return hit;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}
