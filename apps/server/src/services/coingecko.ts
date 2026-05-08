const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const SOLANA_COIN_ID = "solana";
const HISTORY_CACHE_TTL_MS = 10 * 60 * 1000;
const LIVE_CACHE_TTL_MS = 30 * 1000;

type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

interface CoinGeckoMarketChartResponse {
  prices?: Array<[number, number]>;
}

interface CoinGeckoSimplePriceResponse {
  solana?: {
    usd?: number;
    last_updated_at?: number;
  };
}

export interface NormalizedPricePoint {
  timestamp: number;
  price: number;
}

export interface CoinGeckoSolHistory {
  source: "coingecko";
  symbol: "SOL";
  mint: string;
  days: 30 | 90 | 365;
  prices: NormalizedPricePoint[];
}

export interface CoinGeckoSolLivePrice {
  symbol: "SOL";
  mint: string;
  priceUsd: number;
  source: "coingecko";
  timestamp: string;
}

export class CoinGeckoService {
  private readonly baseUrl = process.env.COINGECKO_BASE_URL ?? COINGECKO_BASE_URL;
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  async getSolHistory(days: 30 | 90 | 365): Promise<CoinGeckoSolHistory> {
    const prices = await this.fetchCached(
      `history:${days}`,
      HISTORY_CACHE_TTL_MS,
      async () => {
        const data = await this.get<CoinGeckoMarketChartResponse>(
          `/coins/${SOLANA_COIN_ID}/market_chart`,
          {
            vs_currency: "usd",
            days,
            interval: "daily"
          }
        );
        const normalized = normalizeMarketChart(data.prices);

        if (normalized.length < 2) {
          throw new Error("CoinGecko returned too few SOL historical price points.");
        }

        return resampleDaily(normalized, days);
      }
    );

    return {
      source: "coingecko",
      symbol: "SOL",
      mint: "So11111111111111111111111111111111111111112",
      days,
      prices
    };
  }

  async getSolLivePrice(): Promise<CoinGeckoSolLivePrice> {
    return this.fetchCached("live:sol", LIVE_CACHE_TTL_MS, async () => {
      const data = await this.get<CoinGeckoSimplePriceResponse>("/simple/price", {
        ids: SOLANA_COIN_ID,
        vs_currencies: "usd",
        include_last_updated_at: true
      });
      const price = data.solana?.usd;

      if (!Number.isFinite(price) || !price || price <= 0) {
        throw new Error("CoinGecko live SOL response did not include a valid price.");
      }

      const updatedAt = data.solana?.last_updated_at;

      return {
        symbol: "SOL",
        mint: "So11111111111111111111111111111111111111112",
        priceUsd: price,
        source: "coingecko" as const,
        timestamp: updatedAt ? new Date(updatedAt * 1000).toISOString() : new Date().toISOString()
      };
    });
  }

  private async get<TResponse>(path: string, params: Record<string, string | number | boolean>): Promise<TResponse> {
    const url = new URL(`${this.baseUrl.replace(/\/$/, "")}${path}`);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, { headers: { accept: "application/json" } });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`CoinGecko request failed with ${response.status}: ${body || response.statusText}`);
    }

    return (await response.json()) as TResponse;
  }

  private async fetchCached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    const data = await loader();
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  }
}

function normalizeMarketChart(prices: Array<[number, number]> | undefined): NormalizedPricePoint[] {
  return (prices ?? [])
    .map(([timestampMs, price]) => ({
      timestamp: Math.floor(timestampMs / 1000),
      price: Number(price)
    }))
    .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.price) && point.price > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function resampleDaily(pricePoints: NormalizedPricePoint[], days: 30 | 90 | 365): NormalizedPricePoint[] {
  const prices: NormalizedPricePoint[] = [];

  for (let day = 0; day <= days; day += 1) {
    const sourceIndex = Math.round((day / days) * (pricePoints.length - 1));
    prices.push(pricePoints[sourceIndex]);
  }

  return prices;
}
