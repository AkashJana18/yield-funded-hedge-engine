import type { SupportedTokenSymbol } from "../../constants.js";

export type MarketDataSource = "birdeye";

export interface TokenLivePrice {
  symbol: SupportedTokenSymbol;
  mint: string;
  priceUsd: number;
  source: MarketDataSource;
  timestamp: string;
}

export type SolLivePrice = TokenLivePrice & { symbol: "SOL" };

export interface TokenMetadata {
  symbol: SupportedTokenSymbol;
  mint: string;
  name: string;
  decimals: number;
  logoURI?: string;
  source: MarketDataSource;
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

export interface BirdeyeMultiPriceResponse {
  success?: boolean;
  data?: Record<
    string,
    | {
        value?: number;
        price?: number;
        updateUnixTime?: number;
        updateTime?: number;
      }
    | null
  >;
}

export interface BirdeyeMetadataResponse {
  success?: boolean;
  data?:
    | Array<{
        address?: string;
        mint?: string;
        name?: string;
        symbol?: string;
        decimals?: number;
        logoURI?: string;
        logo_uri?: string;
      }>
    | Record<
        string,
        {
          address?: string;
          mint?: string;
          name?: string;
          symbol?: string;
          decimals?: number;
          logoURI?: string;
          logo_uri?: string;
        }
      >;
}
