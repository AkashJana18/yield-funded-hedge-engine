import { createPhoenixClient, type ExchangeMarketConfig, type OrderbookView } from "@ellipsis-labs/rise";

const DEFAULT_PHOENIX_API_URL = "https://perp-api.phoenix.trade";
const DEFAULT_API_SYMBOL = "SOL";
const DEFAULT_DISPLAY_SYMBOL = "SOL-PERP";

export interface PhoenixOrderbookLevel {
  price: number;
  size: number;
}

export interface PhoenixPerpSnapshot {
  status: "available";
  venue: "phoenix";
  instrument: "perp";
  symbol: "SOL-PERP";
  apiSymbol: string;
  timestamp: string;
  marketStatus: string;
  bestBid: number;
  bestAsk: number;
  mid: number;
  spreadBps: number;
  takerFeeBps: number;
  maxLeverage: number;
  fundingRateAnnualized: number | null;
  orderbook: {
    bids: PhoenixOrderbookLevel[];
    asks: PhoenixOrderbookLevel[];
  };
}

export interface PhoenixPerpUnavailable {
  status: "unavailable";
  venue: "phoenix";
  instrument: "perp";
  symbol: "SOL-PERP";
  apiSymbol: string;
  timestamp: string;
  reason: string;
}

export type PhoenixPerpMarketData = PhoenixPerpSnapshot | PhoenixPerpUnavailable;

export class PhoenixPerpsService {
  private readonly apiSymbol = process.env.PHOENIX_PERP_SYMBOL ?? DEFAULT_API_SYMBOL;
  private readonly client = createPhoenixClient({
    apiUrl: process.env.PHOENIX_API_URL ?? DEFAULT_PHOENIX_API_URL,
    rpcUrl: process.env.SOLANA_RPC_URL,
    ws: false
  });

  async getSolPerpMarketData(levels = 10): Promise<PhoenixPerpMarketData> {
    const timestamp = new Date().toISOString();

    try {
      const [market, orderbook, funding] = await Promise.all([
        this.client.api.markets().getMarket(this.apiSymbol),
        this.client.api.orderbook().getOrderbook(this.apiSymbol),
        this.client.api
          .funding()
          .getFundingRateHistory(this.apiSymbol, { limit: 1 })
          .catch(() => null)
      ]);
      const normalizedOrderbook = normalizeOrderbook(orderbook, levels);
      const bestBid = normalizedOrderbook.bids[0]?.price;
      const bestAsk = normalizedOrderbook.asks[0]?.price;

      if (!Number.isFinite(bestBid) || !Number.isFinite(bestAsk) || !bestBid || !bestAsk) {
        return this.unavailable("Phoenix SOL-PERP orderbook is empty or unavailable.");
      }

      const mid = orderbook.mid ?? (bestBid + bestAsk) / 2;
      const spreadBps = ((bestAsk - bestBid) / mid) * 10_000;

      return {
        status: "available",
        venue: "phoenix",
        instrument: "perp",
        symbol: DEFAULT_DISPLAY_SYMBOL,
        apiSymbol: this.apiSymbol,
        timestamp,
        marketStatus: market.marketStatus,
        bestBid,
        bestAsk,
        mid,
        spreadBps: roundRate(spreadBps),
        takerFeeBps: roundRate((market.takerFee ?? 0) * 10_000),
        maxLeverage: getMaxLeverage(market),
        fundingRateAnnualized: normalizeFundingRate(funding?.rates?.[0]?.fundingRatePercentage),
        orderbook: normalizedOrderbook
      };
    } catch (error) {
      return this.unavailable(error instanceof Error ? error.message : "Phoenix public market data is unavailable.");
    }
  }

  private unavailable(reason: string): PhoenixPerpUnavailable {
    return {
      status: "unavailable",
      venue: "phoenix",
      instrument: "perp",
      symbol: DEFAULT_DISPLAY_SYMBOL,
      apiSymbol: this.apiSymbol,
      timestamp: new Date().toISOString(),
      reason
    };
  }
}

function normalizeOrderbook(orderbook: OrderbookView, levels: number): PhoenixPerpSnapshot["orderbook"] {
  return {
    bids: orderbook.bids
      .slice(0, levels)
      .map(([price, size]) => ({ price: Number(price), size: Number(size) }))
      .filter(isValidLevel),
    asks: orderbook.asks
      .slice(0, levels)
      .map(([price, size]) => ({ price: Number(price), size: Number(size) }))
      .filter(isValidLevel)
  };
}

function isValidLevel(level: PhoenixOrderbookLevel): boolean {
  return Number.isFinite(level.price) && level.price > 0 && Number.isFinite(level.size) && level.size > 0;
}

function getMaxLeverage(market: ExchangeMarketConfig): number {
  const maxLeverage = Math.max(...market.leverageTiers.map((tier) => tier.maxLeverage));
  return Number.isFinite(maxLeverage) && maxLeverage > 0 ? maxLeverage : 1;
}

function normalizeFundingRate(fundingRatePercentage: string | number | undefined): number | null {
  const hourlyPercent = Number(fundingRatePercentage);

  if (!Number.isFinite(hourlyPercent)) {
    return null;
  }

  return roundRate((hourlyPercent / 100) * 24 * 365);
}

function roundRate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
