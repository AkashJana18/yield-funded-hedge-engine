const COINGECKO_BASE_URL = "https://api.coingecko.com";
const CACHE_TTL_MS = 10 * 60 * 1000;

type MarketChartResponse = {
  prices?: Array<[number, number]>;
};

type CacheEntry = {
  prices: Array<{ timestamp: number; price: number }>;
  fetchedAt: number;
};

const cache = new Map<number, CacheEntry>();

export async function getHistoricalSolPrices(days: number): Promise<number[]> {
  return (await getHistoricalSolPricePoints(days)).map((point) => point.price);
}

export async function getHistoricalSolPricePoints(days: number): Promise<Array<{ timestamp: number; price: number }>> {
  const cached = cache.get(days);

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.prices;
  }

  const url = new URL("/api/v3/coins/solana/market_chart", COINGECKO_BASE_URL);
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("days", String(days));

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`CoinGecko request failed with ${response.status}.`);
  }

  const data = (await response.json()) as MarketChartResponse;

  if (!data.prices || data.prices.length < 2) {
    throw new Error("CoinGecko returned too few SOL price points.");
  }

  const prices = resamplePricePoints(data.prices, days);
  cache.set(days, { prices, fetchedAt: Date.now() });

  return prices;
}

export function resamplePrices(pricePoints: Array<[number, number]>, days: number): number[] {
  return resamplePricePoints(pricePoints, days).map((point) => point.price);
}

export function resamplePricePoints(
  pricePoints: Array<[number, number]>,
  days: number
): Array<{ timestamp: number; price: number }> {
  const sortedPrices = pricePoints
    .filter(([, price]) => Number.isFinite(price) && price > 0)
    .sort(([timestampA], [timestampB]) => timestampA - timestampB);

  if (sortedPrices.length < 2) {
    throw new Error("At least two valid historical prices are required.");
  }

  const prices: Array<{ timestamp: number; price: number }> = [];

  for (let day = 0; day <= days; day += 1) {
    const sourceIndex = Math.round((day / days) * (sortedPrices.length - 1));
    prices.push({
      timestamp: Math.floor(sortedPrices[sourceIndex][0] / 1000),
      price: sortedPrices[sourceIndex][1]
    });
  }

  return prices;
}
