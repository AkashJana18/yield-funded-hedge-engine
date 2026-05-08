import { TOKENS, type SupportedTokenSymbol } from "../../constants.js";
import type {
  BirdeyeMetadataResponse,
  BirdeyeMultiPriceResponse,
  BirdeyePriceResponse,
  SolLivePrice,
  TokenLivePrice,
  TokenMetadata
} from "./birdeye.types.js";
import { BirdeyeClient } from "./birdeye.client.js";

const LIVE_PRICE_CACHE_TTL_MS = 15 * 1000;
const METADATA_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export class BirdeyeService {
  constructor(private readonly client = new BirdeyeClient()) {}

  async getSolLivePrice(): Promise<SolLivePrice> {
    const price = await this.getTokenLivePrice("SOL");
    return { ...price, symbol: "SOL" };
  }

  async getTokenLivePrice(symbol: SupportedTokenSymbol): Promise<TokenLivePrice> {
    const token = TOKENS[symbol];
    const data = await this.client.get<BirdeyePriceResponse>(
      "/defi/price",
      { address: token.mint },
      LIVE_PRICE_CACHE_TTL_MS
    );

    const price = data.data?.value ?? data.data?.price;

    if (!Number.isFinite(price) || !price || price <= 0) {
      throw new Error(`Birdeye live ${symbol} price response did not include a valid price.`);
    }

    const updateSeconds = data.data?.updateUnixTime ?? data.data?.updateTime;

    return {
      symbol,
      mint: token.mint,
      priceUsd: price,
      source: "birdeye",
      timestamp: updateSeconds ? new Date(updateSeconds * 1000).toISOString() : new Date().toISOString()
    };
  }

  async getTokenPrices(symbols: SupportedTokenSymbol[]): Promise<TokenLivePrice[]> {
    const uniqueSymbols = [...new Set(symbols)];
    const tokens = uniqueSymbols.map((symbol) => TOKENS[symbol]);

    if (tokens.length === 0) {
      return [];
    }

    if (tokens.length === 1) {
      return [await this.getTokenLivePrice(tokens[0].symbol)];
    }

    try {
      const data = await this.client.get<BirdeyeMultiPriceResponse>(
        "/defi/multi_price",
        {
          list_address: tokens.map((token) => token.mint).join(","),
          include_liquidity: false
        },
        LIVE_PRICE_CACHE_TTL_MS
      );

      return tokens.map((token) => {
        const item = data.data?.[token.mint];
        const price = item?.value ?? item?.price;

        if (!Number.isFinite(price) || !price || price <= 0) {
          throw new Error(`Birdeye live ${token.symbol} price response did not include a valid price.`);
        }

        const updateSeconds = item?.updateUnixTime ?? item?.updateTime;

        return {
          symbol: token.symbol,
          mint: token.mint,
          priceUsd: price,
          source: "birdeye" as const,
          timestamp: updateSeconds ? new Date(updateSeconds * 1000).toISOString() : new Date().toISOString()
        };
      });
    } catch {
      return Promise.all(uniqueSymbols.map((symbol) => this.getTokenLivePrice(symbol)));
    }
  }

  async getTokenMetadata(symbols: SupportedTokenSymbol[]): Promise<TokenMetadata[]> {
    const uniqueSymbols = [...new Set(symbols)];
    const tokens = uniqueSymbols.map((symbol) => TOKENS[symbol]);

    if (tokens.length === 0) {
      return [];
    }

    try {
      const data = await this.client.get<BirdeyeMetadataResponse>(
        "/defi/v3/token/meta-data/multiple",
        { list_address: tokens.map((token) => token.mint).join(",") },
        METADATA_CACHE_TTL_MS
      );

      const metadataByMint = normalizeMetadata(data.data);

      return tokens.map((token) => {
        const metadata = metadataByMint.get(token.mint);

        return {
          symbol: token.symbol,
          mint: token.mint,
          name: metadata?.name ?? token.name,
          decimals: Number.isFinite(metadata?.decimals) ? Number(metadata?.decimals) : token.decimals,
          logoURI: metadata?.logoURI ?? metadata?.logo_uri,
          source: "birdeye" as const
        };
      });
    } catch {
      return tokens.map((token) => ({
        symbol: token.symbol,
        mint: token.mint,
        name: token.name,
        decimals: token.decimals,
        source: "birdeye" as const
      }));
    }
  }

}

function normalizeMetadata(data: BirdeyeMetadataResponse["data"]) {
  const values = Array.isArray(data) ? data : Object.values(data ?? {});

  return new Map(
    values
      .map((item) => [item.address ?? item.mint, item] as const)
      .filter((entry): entry is [string, NonNullable<(typeof values)[number]>] => Boolean(entry[0]))
  );
}
