import { getHistoricalSolPricePoints } from "../../services/coingecko.js";
import type {
  BirdeyeHistoryResponse,
  BirdeyePriceResponse,
  NormalizedPricePoint,
  SolHistoryResponse,
  SolLivePrice
} from "./birdeye.types.js";
import { SOL_MINT_ADDRESS } from "./birdeye.types.js";
import { BirdeyeClient } from "./birdeye.client.js";

const HISTORY_CACHE_TTL_MS = 10 * 60 * 1000;
const LIVE_PRICE_CACHE_TTL_MS = 15 * 1000;

export class BirdeyeService {
  constructor(private readonly client = new BirdeyeClient()) {}

  async getSolLivePrice(): Promise<SolLivePrice> {
    try {
      const data = await this.client.get<BirdeyePriceResponse>(
        "/defi/price",
        { address: SOL_MINT_ADDRESS },
        LIVE_PRICE_CACHE_TTL_MS
      );

      const price = data.data?.value ?? data.data?.price;

      if (!Number.isFinite(price) || !price || price <= 0) {
        throw new Error("Birdeye live SOL price response did not include a valid price.");
      }

      const updateSeconds = data.data?.updateUnixTime ?? data.data?.updateTime;

      return {
        symbol: "SOL",
        priceUsd: price,
        source: "birdeye",
        timestamp: updateSeconds ? new Date(updateSeconds * 1000).toISOString() : new Date().toISOString()
      };
    } catch {
      const history = await this.getSolHistory(30);
      const latest = history.prices[history.prices.length - 1];

      if (!latest) {
        throw new Error("Unable to fetch SOL live price from Birdeye or fallback history.");
      }

      return {
        symbol: "SOL",
        priceUsd: latest.price,
        source: history.source,
        timestamp: new Date(latest.timestamp * 1000).toISOString()
      };
    }
  }

  async getSolHistory(days: 30 | 90 | 365): Promise<SolHistoryResponse> {
    try {
      const prices = await this.getBirdeyeHistory(days);

      return {
        source: "birdeye",
        symbol: "SOL",
        days,
        prices
      };
    } catch (error) {
      const fallbackPrices = await getHistoricalSolPricePoints(days);

      return {
        source: "coingecko",
        symbol: "SOL",
        days,
        prices: fallbackPrices
      };
    }
  }

  private async getBirdeyeHistory(days: 30 | 90 | 365): Promise<NormalizedPricePoint[]> {
    const timeTo = Math.floor(Date.now() / 1000);
    const timeFrom = timeTo - days * 24 * 60 * 60;

    const historyData = await this.client.get<BirdeyeHistoryResponse>(
      "/defi/history_price",
      {
        address: SOL_MINT_ADDRESS,
        address_type: "token",
        type: "1D",
        time_from: timeFrom,
        time_to: timeTo
      },
      HISTORY_CACHE_TTL_MS
    );

    const history = normalizeBirdeyeItems(historyData.data?.items);

    if (history.length >= Math.min(days, 2)) {
      return resampleDaily(history, days);
    }

    // Birdeye supports both history_price and OHLCV endpoints. Keep OHLCV as a
    // secondary path because some API packages expose OHLCV before history_price.
    const ohlcvData = await this.client.get<BirdeyeHistoryResponse>(
      "/defi/ohlcv",
      {
        address: SOL_MINT_ADDRESS,
        type: "1D",
        currency: "usd",
        time_from: timeFrom,
        time_to: timeTo
      },
      HISTORY_CACHE_TTL_MS
    );

    const ohlcv = normalizeBirdeyeItems(ohlcvData.data?.items);

    if (ohlcv.length < 2) {
      throw new Error("Birdeye returned too few historical SOL price points.");
    }

    return resampleDaily(ohlcv, days);
  }
}

function normalizeBirdeyeItems(
  items:
    | Array<{
        unixTime?: number;
        time?: number;
        value?: number;
        price?: number;
        close?: number;
        c?: number;
      }>
    | undefined
): NormalizedPricePoint[] {
  return (items ?? [])
    .map((item) => ({
      timestamp: Number(item.unixTime ?? item.time),
      price: Number(item.value ?? item.price ?? item.close ?? item.c)
    }))
    .filter((item) => Number.isFinite(item.timestamp) && Number.isFinite(item.price) && item.price > 0)
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
