export const SOL_MINT_ADDRESS = "So11111111111111111111111111111111111111112";

export type MarketDataSource = "birdeye" | "coingecko";

export interface SolLivePrice {
  symbol: "SOL";
  priceUsd: number;
  source: MarketDataSource;
  timestamp: string;
}

export interface NormalizedPricePoint {
  timestamp: number;
  price: number;
}

export interface SolHistoryResponse {
  source: MarketDataSource;
  symbol: "SOL";
  days: 30 | 90 | 365;
  prices: NormalizedPricePoint[];
}

export interface BirdeyePriceResponse {
  success?: boolean;
  data?: {
    value?: number;
    price?: number;
    updateUnixTime?: number;
    updateTime?: number;
  };
}

export interface BirdeyeHistoryResponse {
  success?: boolean;
  data?: {
    items?: Array<{
      unixTime?: number;
      time?: number;
      value?: number;
      price?: number;
      close?: number;
      c?: number;
    }>;
  };
}
