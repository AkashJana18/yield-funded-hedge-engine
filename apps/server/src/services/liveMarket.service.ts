import type { SolLivePrice } from "../integrations/birdeye/birdeye.types.js";
import { BirdeyeService } from "../integrations/birdeye/birdeye.service.js";
import { CoinGeckoService, type CoinGeckoSolLivePrice } from "./coingecko.js";

const LIVE_SOL_CACHE_TTL_MS = 20_000;

type LiveSolPrice = SolLivePrice | CoinGeckoSolLivePrice;

type LiveCacheEntry = {
  expiresAt: number;
  data: LiveSolPrice;
};

export class LiveMarketService {
  private cache: LiveCacheEntry | null = null;

  constructor(
    private readonly birdeye = new BirdeyeService(),
    private readonly coingecko = new CoinGeckoService()
  ) {}

  async getSolLivePrice(): Promise<LiveSolPrice> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.data;
    }

    let data: LiveSolPrice;

    try {
      data = await this.birdeye.getSolLivePrice();
    } catch {
      data = await this.coingecko.getSolLivePrice();
    }

    this.cache = { data, expiresAt: Date.now() + LIVE_SOL_CACHE_TTL_MS };
    return data;
  }
}
